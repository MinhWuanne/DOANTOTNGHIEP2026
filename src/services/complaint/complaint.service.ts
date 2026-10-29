
import { randomUUID } from "node:crypto";

import {
    AdminRole,
    AdminStatus,
    ComplaintActorType,
    ComplaintCategory,
    ComplaintMessageType,
    ComplaintStatus,
    AccountPlatform,
} from "../../generated/prisma/enums.js";

import { prisma } from "../../lib/prisma.js";

import {
    complaintAttachmentService,
    type StoredComplaintAttachment,
} from "./complaint-attachment.service.js";

const RESPONSE_SLA_HOURS = 24;
const MAX_SUBJECT_LENGTH = 200;
const MAX_CONTENT_LENGTH = 10000;

export interface CreateComplaintInput {
    accountId: string | number | bigint;
    platform: AccountPlatform;
    category: string;
    subject: string;
    content: string;
}

export interface SendComplaintMessageWithAttachmentInput {
    complaintId: string | number | bigint;
    actorId: string | number | bigint;
    content: string;
    attachment: StoredComplaintAttachment;
}

export class ComplaintService {
    private generateTicketCode(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const randomPart = randomUUID()
            .replace(/-/g, "")
            .slice(0, 8)
            .toUpperCase();

        return `KN-${timestamp}-${randomPart}`;
    }

    private validateCustomerPlatform(
        platform: AccountPlatform,
    ): void {
        if (
            platform !== AccountPlatform.MEMBER &&
            platform !== AccountPlatform.FRANCHISE
        ) {
            throw new Error("COMPLAINT_PLATFORM_NOT_ALLOWED");
        }
    }

    async create(input: CreateComplaintInput) {
        this.validateCustomerPlatform(input.platform);

        const subject = input.subject?.trim();
        const content = input.content?.trim();

        if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
            throw new Error("COMPLAINT_INVALID_SUBJECT");
        }

        if (!content || content.length > MAX_CONTENT_LENGTH) {
            throw new Error("COMPLAINT_INVALID_CONTENT");
        }

        const allowedCategories = [
            "ORDER",
            "PAYMENT",
            "RETURN",
            "WALLET",
            "COMMISSION",
            "WITHDRAWAL",
            "ACCOUNT",
            "FEEDBACK",
            "REF",
            "OTHER",
        ];

        if (!allowedCategories.includes(input.category)) {
            throw new Error("COMPLAINT_INVALID_CATEGORY");
        }

        const accountId = BigInt(input.accountId);
        const now = new Date();
        const responseDueAt = new Date(
            now.getTime() + RESPONSE_SLA_HOURS * 60 * 60 * 1000,
        );

        return prisma.$transaction(async (tx) => {
            const account = await tx.userAccount.findUnique({
                where: { id: accountId },
                select: {
                    id: true,
                    platform: true,
                    status: true,
                },
            });

            if (
                !account ||
                account.platform !== input.platform ||
                account.status !== "ACTIVE"
            ) {
                throw new Error("COMPLAINT_ACCOUNT_NOT_ALLOWED");
            }

            let complaint;

            // Retry if the generated ticket code collides with an existing code.
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    complaint = await tx.complaint.create({
                        data: {
                            ticketCode: this.generateTicketCode(),
                            accountId,
                            category: input.category as
                                | "ORDER"
                                | "PAYMENT"
                                | "RETURN"
                                | "WALLET"
                                | "COMMISSION"
                                | "WITHDRAWAL"
                                | "ACCOUNT"
                                | "FEEDBACK"
                                | "REF"
                                | "OTHER",
                            subject,
                            status: ComplaintStatus.PENDING,
                            firstResponseAt: null,
                            lastMemberMessageAt: now,
                            lastAdminReplyAt: null,
                            responseDueAt,
                            responsePending: true,
                            messages: {
                                create: {
                                    senderType: ComplaintActorType.ACCOUNT,
                                    senderAccountId: accountId,
                                    messageType: ComplaintMessageType.MESSAGE,
                                    content,
                                },
                            },
                        },
                    });

                    break;
                } catch (error) {
                    const isUniqueConflict =
                        typeof error === "object" &&
                        error !== null &&
                        "code" in error &&
                        error.code === "P2002";

                    if (!isUniqueConflict || attempt === 2) {
                        throw error;
                    }
                }
            }

            if (!complaint) {
                throw new Error("COMPLAINT_CREATE_FAILED");
            }

            await tx.complaintHistory.create({
                data: {
                    complaintId: complaint.id,
                    actorType: ComplaintActorType.ACCOUNT,
                    actorAccountId: accountId,
                    action: "CREATED",
                    oldValue: null,
                    newValue: JSON.stringify({
                        ticketCode: complaint.ticketCode,
                        status: ComplaintStatus.PENDING,
                        category: input.category,
                    }),
                },
            });

            return complaint;
        });
    }

    async listOwn(
        accountId: string | number | bigint,
        platform: AccountPlatform,
    ) {
        this.validateCustomerPlatform(platform);

        const id = BigInt(accountId);

        const account = await prisma.userAccount.findUnique({
            where: { id },
            select: { id: true, platform: true, status: true },
        });

        if (
            !account ||
            account.platform !== platform ||
            account.status !== "ACTIVE"
        ) {
            throw new Error("COMPLAINT_ACCOUNT_NOT_ALLOWED");
        }

        return prisma.complaint.findMany({
            where: { accountId: id },
            orderBy: { createdAt: "desc" },
            take: 50,
            select: {
                id: true,
                ticketCode: true,
                category: true,
                subject: true,
                status: true,
                responsePending: true,
                responseDueAt: true,
                createdAt: true,
                updatedAt: true,
                closedAt: true,
                _count: {
                    select: { messages: true },
                },
            },
        });
    }

    async getOwn(
        accountId: string | number | bigint,
        platform: AccountPlatform,
        complaintId: string | number | bigint,
    ) {
        this.validateCustomerPlatform(platform);

        const id = BigInt(accountId);
        const ticketId = BigInt(complaintId);

        const account = await prisma.userAccount.findUnique({
            where: { id },
            select: { id: true, platform: true, status: true },
        });

        if (
            !account ||
            account.platform !== platform ||
            account.status !== "ACTIVE"
        ) {
            throw new Error("COMPLAINT_ACCOUNT_NOT_ALLOWED");
        }

        const complaint = await prisma.complaint.findFirst({
            where: {
                id: ticketId,
                accountId: id,
            },
            select: {
                id: true,
                ticketCode: true,
                category: true,
                subject: true,
                status: true,
                resolutionReason: true,
                responseDueAt: true,
                responsePending: true,
                firstResponseAt: true,
                createdAt: true,
                updatedAt: true,
                closedAt: true,
                messages: {
                    where: {
                        messageType: ComplaintMessageType.MESSAGE,
                        deletedAt: null,
                    },
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        senderType: true,
                        senderAccountId: true,
                        senderAdminId: true,
                        messageType: true,
                        content: true,
                        createdAt: true,
                        attachments: {
                            select: {
                                id: true,
                                originalName: true,
                                mimeType: true,
                                sizeBytes: true,
                                createdAt: true,
                            },
                        },
                    },
                },
                histories: {
                    where: {
                        actorType: ComplaintActorType.ACCOUNT,
                        actorAccountId: id,
                    },
                    orderBy: { createdAt: "asc" },
                    select: {
                        action: true,
                        oldValue: true,
                        newValue: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!complaint) {
            throw new Error("COMPLAINT_NOT_FOUND");
        }

        return complaint;
    }

    async listAdmin(input: {
        status?: string;
        category?: string;
        search?: string;
        page?: number;
        pageSize?: number;
    }) {
        const allowedStatuses = Object.values(ComplaintStatus);
        const allowedCategories = Object.values(ComplaintCategory);

        if (
            input.status &&
            !allowedStatuses.includes(input.status as ComplaintStatus)
        ) {
            throw new Error("COMPLAINT_INVALID_STATUS");
        }

        if (
            input.category &&
            !allowedCategories.includes(input.category as ComplaintCategory)
        ) {
            throw new Error("COMPLAINT_INVALID_CATEGORY");
        }

        const page = input.page ?? 1;
        const pageSize = input.pageSize ?? 20;

        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(pageSize) ||
            pageSize < 1 ||
            pageSize > 100
        ) {
            throw new Error("COMPLAINT_INVALID_PAGINATION");
        }

        const search = input.search?.trim();

        const where = {
            ...(input.status
                ? { status: input.status as ComplaintStatus }
                : {}),
            ...(input.category
                ? { category: input.category as ComplaintCategory }
                : {}),
            ...(search
                ? {
                    OR: [
                        { ticketCode: { contains: search } },
                        { subject: { contains: search } },
                    ],
                }
                : {}),
        };

        const [items, total] = await prisma.$transaction([
            prisma.complaint.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    ticketCode: true,
                    accountId: true,
                    category: true,
                    subject: true,
                    status: true,
                    responsePending: true,
                    responseDueAt: true,
                    createdAt: true,
                    updatedAt: true,
                    closedAt: true,
                    _count: {
                        select: { messages: true },
                    },
                },
            }),
            prisma.complaint.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    async getAdmin(complaintId: string | number | bigint) {
        const id = BigInt(complaintId);

        const complaint = await prisma.complaint.findUnique({
            where: { id },
            select: {
                id: true,
                ticketCode: true,
                accountId: true,
                account: {
                    select: {
                        platform: true,
                    },
                },
                category: true,
                subject: true,
                status: true,
                resolutionReason: true,
                firstResponseAt: true,
                lastMemberMessageAt: true,
                lastAdminReplyAt: true,
                responseDueAt: true,
                responsePending: true,
                createdAt: true,
                updatedAt: true,
                closedAt: true,

                messages: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        senderType: true,
                        senderAccountId: true,
                        senderAdminId: true,
                        messageType: true,
                        content: true,
                        createdAt: true,
                        attachments: {
                            select: {
                                id: true,
                                originalName: true,
                                mimeType: true,
                                sizeBytes: true,
                                createdAt: true,
                            },
                        },
                    },
                },

                assignments: {
                    orderBy: { assignedAt: "asc" },
                    select: {
                        adminId: true,
                        assignedAt: true,
                    },
                },

                histories: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        actorType: true,
                        actorAccountId: true,
                        actorAdminId: true,
                        action: true,
                        oldValue: true,
                        newValue: true,
                        createdAt: true,
                    },
                },
            },
        });

        if (!complaint) {
            throw new Error("COMPLAINT_NOT_FOUND");
        }

        return complaint;
    }

    async assignAdmin(
        complaintId: string | number | bigint,
        adminId: string | number | bigint,
        actorAdminId: string | number | bigint,
    ) {
        let ticketId: bigint;
        let targetAdminId: bigint;
        let actorId: bigint;

        try {
            ticketId = BigInt(complaintId);
            targetAdminId = BigInt(adminId);
            actorId = BigInt(actorAdminId);
        } catch {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        if (
            ticketId <= 0n ||
            targetAdminId <= 0n ||
            actorId <= 0n
        ) {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        return prisma.$transaction(async (tx) => {
            // Lock the complaint row so concurrent assignments
            // cannot exceed the maximum of two assigned admins.
            const lockedRows = await tx.$queryRaw<
                Array<{ id: bigint }>
            >`
                SELECT id
                FROM complaints
                WHERE id = ${ticketId}
                FOR UPDATE
            `;

            if (lockedRows.length === 0) {
                throw new Error("COMPLAINT_NOT_FOUND");
            }

            const complaint = await tx.complaint.findUnique({
                where: { id: ticketId },
                select: {
                    id: true,
                    status: true,
                    assignments: {
                        select: {
                            adminId: true,
                        },
                        orderBy: {
                            assignedAt: "asc",
                        },
                    },
                },
            });

            if (!complaint) {
                throw new Error("COMPLAINT_NOT_FOUND");
            }

            if (
                complaint.status === ComplaintStatus.RESOLVED ||
                complaint.status === ComplaintStatus.REJECTED
            ) {
                throw new Error("COMPLAINT_ALREADY_CLOSED");
            }

            const targetAdmin = await tx.adminAccount.findUnique({
                where: {
                    id: targetAdminId,
                },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    status: true,
                },
            });

            if (
                !targetAdmin ||
                targetAdmin.role !== AdminRole.ADMIN ||
                targetAdmin.status !== AdminStatus.ACTIVE
            ) {
                throw new Error("COMPLAINT_ASSIGNEE_NOT_ACTIVE");
            }

            if (
                complaint.assignments.some(
                    (assignment) =>
                        assignment.adminId === targetAdminId,
                )
            ) {
                throw new Error("COMPLAINT_ADMIN_ALREADY_ASSIGNED");
            }

            if (complaint.assignments.length >= 2) {
                throw new Error("COMPLAINT_MAX_ASSIGNEES_REACHED");
            }

            const actor = await tx.adminAccount.findUnique({
                where: {
                    id: actorId,
                },
                select: {
                    id: true,
                    role: true,
                    status: true,
                },
            });

            if (
                !actor ||
                actor.role !== AdminRole.ADMIN ||
                actor.status !== AdminStatus.ACTIVE
            ) {
                throw new Error("COMPLAINT_ACTOR_NOT_ACTIVE");
            }

            const assignment = await tx.complaintAssignment.create({
                data: {
                    complaintId: ticketId,
                    adminId: targetAdminId,
                },
                select: {
                    id: true,
                    complaintId: true,
                    adminId: true,
                    assignedAt: true,
                    admin: {
                        select: {
                            username: true,
                            email: true,
                        },
                    },
                },
            });

            await tx.complaintHistory.create({
                data: {
                    complaintId: ticketId,
                    actorType: ComplaintActorType.ADMIN,
                    actorAdminId: actorId,
                    action: "ASSIGNED",
                    oldValue: JSON.stringify({
                        adminIds: complaint.assignments.map(
                            (item) => item.adminId.toString(),
                        ),
                    }),
                    newValue: JSON.stringify({
                        adminId: targetAdminId.toString(),
                        username: targetAdmin.username,
                    }),
                },
            });

            return assignment;
        });
    }

    async sendCustomerMessage(
        complaintId: string | number | bigint,
        accountId: string | number | bigint,
        platform: AccountPlatform,
        content: string,
    ) {
        this.validateCustomerPlatform(platform);

        let ticketId: bigint;
        let actorId: bigint;

        try {
            ticketId = BigInt(complaintId);
            actorId = BigInt(accountId);
        } catch {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        if (ticketId <= 0n || actorId <= 0n) {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        const normalizedContent = content?.trim();

        if (
            !normalizedContent ||
            normalizedContent.length > MAX_CONTENT_LENGTH
        ) {
            throw new Error("COMPLAINT_INVALID_CONTENT");
        }

        return prisma.$transaction(async (tx) => {
            const lockedRows = await tx.$queryRaw<
                Array<{ id: bigint }>
            >`
                SELECT id
                FROM complaints
                WHERE id = ${ticketId}
                FOR UPDATE
            `;

            if (lockedRows.length === 0) {
                throw new Error("COMPLAINT_NOT_FOUND");
            }

            const account = await tx.userAccount.findUnique({
                where: { id: actorId },
                select: {
                    id: true,
                    platform: true,
                    status: true,
                },
            });

            if (
                !account ||
                account.platform !== platform ||
                account.status !== "ACTIVE"
            ) {
                throw new Error("COMPLAINT_ACCOUNT_NOT_ALLOWED");
            }

            const complaint = await tx.complaint.findFirst({
                where: {
                    id: ticketId,
                    accountId: actorId,
                },
                select: {
                    id: true,
                    status: true,
                    responseDueAt: true,
                    responsePending: true,
                    lastMemberMessageAt: true,
                },
            });

            if (!complaint) {
                throw new Error("COMPLAINT_NOT_FOUND");
            }

            if (
                complaint.status === ComplaintStatus.RESOLVED ||
                complaint.status === ComplaintStatus.REJECTED
            ) {
                throw new Error("COMPLAINT_ALREADY_CLOSED");
            }

            const now = new Date();

            const responseDueAt = new Date(
                now.getTime() +
                RESPONSE_SLA_HOURS * 60 * 60 * 1000,
            );

            const message = await tx.complaintMessage.create({
                data: {
                    complaintId: ticketId,
                    senderType: ComplaintActorType.ACCOUNT,
                    senderAccountId: actorId,
                    messageType: ComplaintMessageType.MESSAGE,
                    content: normalizedContent,
                },
                select: {
                    id: true,
                    complaintId: true,
                    senderType: true,
                    senderAccountId: true,
                    messageType: true,
                    content: true,
                    createdAt: true,
                },
            });

            await tx.complaint.update({
                where: { id: ticketId },
                data: {
                    lastMemberMessageAt: now,
                    responseDueAt,
                    responsePending: true,
                },
            });

            await tx.complaintHistory.create({
                data: {
                    complaintId: ticketId,
                    actorType: ComplaintActorType.ACCOUNT,
                    actorAccountId: actorId,
                    action: "CUSTOMER_MESSAGE",
                    oldValue: JSON.stringify({
                        lastMemberMessageAt:
                            complaint.lastMemberMessageAt?.toISOString() ??
                            null,
                        responseDueAt:
                            complaint.responseDueAt?.toISOString() ??
                            null,
                        responsePending: complaint.responsePending,
                    }),
                    newValue: JSON.stringify({
                        messageId: message.id.toString(),
                        lastMemberMessageAt: now.toISOString(),
                        responseDueAt: responseDueAt.toISOString(),
                        responsePending: true,
                    }),
                },
            });

            return message;
        });
    }

    async sendAdminMessage(
        complaintId: string | number | bigint,
        actorAdminId: string | number | bigint,
        content: string,
        messageType: ComplaintMessageType = ComplaintMessageType.MESSAGE,
    ) {
        let ticketId: bigint;
        let actorId: bigint;

        try {
            ticketId = BigInt(complaintId);
            actorId = BigInt(actorAdminId);
        } catch {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        if (ticketId <= 0n || actorId <= 0n) {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        if (
            messageType !== ComplaintMessageType.MESSAGE &&
            messageType !== ComplaintMessageType.INTERNAL_NOTE
        ) {
            throw new Error("COMPLAINT_INVALID_MESSAGE_TYPE");
        }

        const normalizedContent = content?.trim();

        if (
            !normalizedContent ||
            normalizedContent.length > MAX_CONTENT_LENGTH
        ) {
            throw new Error("COMPLAINT_INVALID_CONTENT");
        }

        return prisma.$transaction(async (tx) => {
            const lockedRows = await tx.$queryRaw<
                Array<{ id: bigint }>
            >`
                SELECT id
                FROM complaints
                WHERE id = ${ticketId}
                FOR UPDATE
            `;

            if (lockedRows.length === 0) {
                throw new Error("COMPLAINT_NOT_FOUND");
            }

            const complaint = await tx.complaint.findUnique({
                where: { id: ticketId },
                select: {
                    id: true,
                    status: true,
                    firstResponseAt: true,
                    assignments: {
                        where: { adminId: actorId },
                        select: { adminId: true },
                    },
                },
            });

            if (!complaint) {
                throw new Error("COMPLAINT_NOT_FOUND");
            }

            if (
                complaint.status === ComplaintStatus.RESOLVED ||
                complaint.status === ComplaintStatus.REJECTED
            ) {
                throw new Error("COMPLAINT_ALREADY_CLOSED");
            }

            if (complaint.assignments.length === 0) {
                throw new Error("COMPLAINT_ADMIN_NOT_ASSIGNED");
            }

            const actor = await tx.adminAccount.findUnique({
                where: { id: actorId },
                select: {
                    id: true,
                    role: true,
                    status: true,
                },
            });

            if (
                !actor ||
                actor.role !== AdminRole.ADMIN ||
                actor.status !== AdminStatus.ACTIVE
            ) {
                throw new Error("COMPLAINT_ACTOR_NOT_ACTIVE");
            }

            const now = new Date();

            const message = await tx.complaintMessage.create({
                data: {
                    complaintId: ticketId,
                    senderType: ComplaintActorType.ADMIN,
                    senderAdminId: actorId,
                    messageType,
                    content: normalizedContent,
                },
                select: {
                    id: true,
                    complaintId: true,
                    senderType: true,
                    senderAdminId: true,
                    messageType: true,
                    content: true,
                    createdAt: true,
                },
            });

            if (messageType === ComplaintMessageType.MESSAGE) {
                const updatedComplaint = await tx.complaint.update({
                    where: { id: ticketId },
                    data: {
                        firstResponseAt:
                            complaint.firstResponseAt ?? now,
                        lastAdminReplyAt: now,
                        responsePending: false,
                        ...(complaint.status === ComplaintStatus.PENDING
                            ? { status: ComplaintStatus.IN_PROGRESS }
                            : {}),
                    },
                    select: {
                        status: true,
                    },
                });

                if (complaint.status === ComplaintStatus.PENDING) {
                    await tx.complaintHistory.create({
                        data: {
                            complaintId: ticketId,
                            actorType: ComplaintActorType.ADMIN,
                            actorAdminId: actorId,
                            action: "STATUS_CHANGED",
                            oldValue: JSON.stringify({
                                status: ComplaintStatus.PENDING,
                            }),
                            newValue: JSON.stringify({
                                status: updatedComplaint.status,
                            }),
                        },
                    });
                }
            }

            await tx.complaintHistory.create({
                data: {
                    complaintId: ticketId,
                    actorType: ComplaintActorType.ADMIN,
                    actorAdminId: actorId,
                    action:
                        messageType === ComplaintMessageType.MESSAGE
                            ? "ADMIN_REPLIED"
                            : "INTERNAL_NOTE_ADDED",
                    oldValue: null,
                    newValue: JSON.stringify({
                        messageId: message.id.toString(),
                        messageType,
                    }),
                },
            });

            return message;
        });
    }

    async recallAdminMessage(
        complaintId: string | number | bigint,
        messageId: string | number | bigint,
        actorAdminId: string | number | bigint,
    ) {
        let ticketId: bigint;
        let targetMessageId: bigint;
        let actorId: bigint;

        try {
            ticketId = BigInt(complaintId);
            targetMessageId = BigInt(messageId);
            actorId = BigInt(actorAdminId);
        } catch {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        if (
            ticketId <= 0n ||
            targetMessageId <= 0n ||
            actorId <= 0n
        ) {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        return prisma.$transaction(async (tx) => {
            const lockedRows = await tx.$queryRaw<
                Array<{ id: bigint }>
            >`
                SELECT id
                FROM complaints
                WHERE id = ${ticketId}
                FOR UPDATE
            `;

            if (lockedRows.length === 0) {
                throw new Error("COMPLAINT_NOT_FOUND");
            }

            const complaint = await tx.complaint.findUnique({
                where: { id: ticketId },
                select: {
                    id: true,
                    status: true,
                    assignments: {
                        where: { adminId: actorId },
                        select: { adminId: true },
                    },
                },
            });

            if (!complaint) {
                throw new Error("COMPLAINT_NOT_FOUND");
            }

            if (
                complaint.status === ComplaintStatus.RESOLVED ||
                complaint.status === ComplaintStatus.REJECTED
            ) {
                throw new Error("COMPLAINT_ALREADY_CLOSED");
            }

            if (complaint.assignments.length === 0) {
                throw new Error("COMPLAINT_ADMIN_NOT_ASSIGNED");
            }

            const actor = await tx.adminAccount.findUnique({
                where: { id: actorId },
                select: {
                    id: true,
                    role: true,
                    status: true,
                },
            });

            if (
                !actor ||
                actor.role !== AdminRole.ADMIN ||
                actor.status !== AdminStatus.ACTIVE
            ) {
                throw new Error("COMPLAINT_ACTOR_NOT_ACTIVE");
            }

            const message = await tx.complaintMessage.findFirst({
                where: {
                    id: targetMessageId,
                    complaintId: ticketId,
                },
                select: {
                    id: true,
                    complaintId: true,
                    senderType: true,
                    senderAdminId: true,
                    messageType: true,
                    content: true,
                    createdAt: true,
                    deletedAt: true,
                },
            });

            if (!message || message.deletedAt !== null) {
                throw new Error("COMPLAINT_MESSAGE_NOT_FOUND");
            }

            if (
                message.messageType !== ComplaintMessageType.MESSAGE ||
                message.senderType !== ComplaintActorType.ADMIN
            ) {
                throw new Error("COMPLAINT_MESSAGE_NOT_RECALLABLE");
            }

            if (message.senderAdminId !== actorId) {
                throw new Error("COMPLAINT_MESSAGE_NOT_OWNED");
            }

            const now = new Date();
            const recallWindowMs = 5 * 60 * 1000;

            if (
                now.getTime() - message.createdAt.getTime() >
                recallWindowMs
            ) {
                throw new Error(
                    "COMPLAINT_MESSAGE_RECALL_WINDOW_EXPIRED",
                );
            }

            const updated = await tx.complaintMessage.updateMany({
                where: {
                    id: targetMessageId,
                    complaintId: ticketId,
                    senderType: ComplaintActorType.ADMIN,
                    senderAdminId: actorId,
                    messageType: ComplaintMessageType.MESSAGE,
                    deletedAt: null,
                },
                data: {
                    deletedAt: now,
                    deletedByAdminId: actorId,
                },
            });

            if (updated.count !== 1) {
                throw new Error("COMPLAINT_MESSAGE_NOT_FOUND");
            }

            await tx.complaintHistory.create({
                data: {
                    complaintId: ticketId,
                    actorType: ComplaintActorType.ADMIN,
                    actorAdminId: actorId,
                    action: "ADMIN_MESSAGE_RECALLED",
                    oldValue: null,
                    newValue: JSON.stringify({
                        messageId: targetMessageId.toString(),
                        recalledAt: now.toISOString(),
                    }),
                },
            });

            return {
                id: targetMessageId,
                complaintId: ticketId,
                deletedAt: now,
                deletedByAdminId: actorId,
            };
        });
    }

    async sendCustomerMessageWithAttachment(
        complaintId: string | number | bigint,
        accountId: string | number | bigint,
        platform: AccountPlatform,
        content: string,
        attachment: StoredComplaintAttachment,
    ) {
        this.validateCustomerPlatform(platform);

        let ticketId: bigint;
        let actorId: bigint;

        try {
            ticketId = BigInt(complaintId);
            actorId = BigInt(accountId);
        } catch {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        if (ticketId <= 0n || actorId <= 0n) {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        const normalizedContent = content?.trim();

        if (
            !normalizedContent ||
            normalizedContent.length > MAX_CONTENT_LENGTH
        ) {
            throw new Error("COMPLAINT_INVALID_CONTENT");
        }

        try {
            return await prisma.$transaction(async (tx) => {
                const lockedRows = await tx.$queryRaw<
                    Array<{ id: bigint }>
                >`
                    SELECT id
                    FROM complaints
                    WHERE id = ${ticketId}
                    FOR UPDATE
                `;

                if (lockedRows.length === 0) {
                    throw new Error("COMPLAINT_NOT_FOUND");
                }

                const account = await tx.userAccount.findUnique({
                    where: { id: actorId },
                    select: {
                        id: true,
                        platform: true,
                        status: true,
                    },
                });

                if (
                    !account ||
                    account.platform !== platform ||
                    account.status !== "ACTIVE"
                ) {
                    throw new Error("COMPLAINT_ACCOUNT_NOT_ALLOWED");
                }

                const complaint = await tx.complaint.findFirst({
                    where: {
                        id: ticketId,
                        accountId: actorId,
                    },
                    select: {
                        id: true,
                        status: true,
                        responseDueAt: true,
                        responsePending: true,
                        lastMemberMessageAt: true,
                    },
                });

                if (!complaint) {
                    throw new Error("COMPLAINT_NOT_FOUND");
                }

                if (
                    complaint.status === ComplaintStatus.RESOLVED ||
                    complaint.status === ComplaintStatus.REJECTED
                ) {
                    throw new Error("COMPLAINT_ALREADY_CLOSED");
                }

                const now = new Date();
                const responseDueAt = new Date(
                    now.getTime() +
                    RESPONSE_SLA_HOURS * 60 * 60 * 1000,
                );

                const message = await tx.complaintMessage.create({
                    data: {
                        complaintId: ticketId,
                        senderType: ComplaintActorType.ACCOUNT,
                        senderAccountId: actorId,
                        messageType: ComplaintMessageType.MESSAGE,
                        content: normalizedContent,
                        attachments: {
                            create: {
                                originalName: attachment.originalName,
                                storageKey: attachment.storageKey,
                                mimeType: attachment.mimeType,
                                sizeBytes: attachment.sizeBytes,
                            },
                        },
                    },
                    include: {
                        attachments: {
                            select: {
                                id: true,
                                originalName: true,
                                mimeType: true,
                                sizeBytes: true,
                                createdAt: true,
                            },
                        },
                    },
                });

                await tx.complaint.update({
                    where: { id: ticketId },
                    data: {
                        lastMemberMessageAt: now,
                        responseDueAt,
                        responsePending: true,
                    },
                });

                await tx.complaintHistory.create({
                    data: {
                        complaintId: ticketId,
                        actorType: ComplaintActorType.ACCOUNT,
                        actorAccountId: actorId,
                        action: "CUSTOMER_MESSAGE",
                        oldValue: JSON.stringify({
                            lastMemberMessageAt:
                                complaint.lastMemberMessageAt?.toISOString() ??
                                null,
                            responseDueAt:
                                complaint.responseDueAt?.toISOString() ??
                                null,
                            responsePending: complaint.responsePending,
                        }),
                        newValue: JSON.stringify({
                            messageId: message.id.toString(),
                            messageType: ComplaintMessageType.MESSAGE,
                            hasAttachment: true,
                            lastMemberMessageAt: now.toISOString(),
                            responseDueAt: responseDueAt.toISOString(),
                            responsePending: true,
                        }),
                    },
                });

                return message;
            });
        } catch (error) {
            try {
                await complaintAttachmentService.remove(
                    attachment.storageKey,
                );
            } catch (cleanupError) {
                throw new AggregateError(
                    [error, cleanupError],
                    "COMPLAINT_ATTACHMENT_TRANSACTION_AND_CLEANUP_FAILED",
                );
            }

            throw error;
        }
    }

    async sendAdminMessageWithAttachment(
        complaintId: string | number | bigint,
        actorAdminId: string | number | bigint,
        content: string,
        attachment: StoredComplaintAttachment,
    ) {
        let ticketId: bigint;
        let actorId: bigint;

        try {
            ticketId = BigInt(complaintId);
            actorId = BigInt(actorAdminId);
        } catch {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        if (ticketId <= 0n || actorId <= 0n) {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        const normalizedContent = content?.trim();

        if (
            !normalizedContent ||
            normalizedContent.length > MAX_CONTENT_LENGTH
        ) {
            throw new Error("COMPLAINT_INVALID_CONTENT");
        }

        try {
            return await prisma.$transaction(async (tx) => {
                const lockedRows = await tx.$queryRaw<
                    Array<{ id: bigint }>
                >`
                    SELECT id
                    FROM complaints
                    WHERE id = ${ticketId}
                    FOR UPDATE
                `;

                if (lockedRows.length === 0) {
                    throw new Error("COMPLAINT_NOT_FOUND");
                }

                const complaint = await tx.complaint.findUnique({
                    where: { id: ticketId },
                    select: {
                        id: true,
                        status: true,
                        firstResponseAt: true,
                        assignments: {
                            where: { adminId: actorId },
                            select: { adminId: true },
                        },
                    },
                });

                if (!complaint) {
                    throw new Error("COMPLAINT_NOT_FOUND");
                }

                if (
                    complaint.status === ComplaintStatus.RESOLVED ||
                    complaint.status === ComplaintStatus.REJECTED
                ) {
                    throw new Error("COMPLAINT_ALREADY_CLOSED");
                }

                if (complaint.assignments.length === 0) {
                    throw new Error("COMPLAINT_ADMIN_NOT_ASSIGNED");
                }

                const actor = await tx.adminAccount.findUnique({
                    where: { id: actorId },
                    select: {
                        id: true,
                        role: true,
                        status: true,
                    },
                });

                if (
                    !actor ||
                    actor.role !== AdminRole.ADMIN ||
                    actor.status !== AdminStatus.ACTIVE
                ) {
                    throw new Error("COMPLAINT_ACTOR_NOT_ACTIVE");
                }

                const now = new Date();

                const message = await tx.complaintMessage.create({
                    data: {
                        complaintId: ticketId,
                        senderType: ComplaintActorType.ADMIN,
                        senderAdminId: actorId,
                        messageType: ComplaintMessageType.MESSAGE,
                        content: normalizedContent,
                        attachments: {
                            create: {
                                originalName: attachment.originalName,
                                storageKey: attachment.storageKey,
                                mimeType: attachment.mimeType,
                                sizeBytes: attachment.sizeBytes,
                            },
                        },
                    },
                    include: {
                        attachments: {
                            select: {
                                id: true,
                                originalName: true,
                                mimeType: true,
                                sizeBytes: true,
                                createdAt: true,
                            },
                        },
                    },
                });

                await tx.complaint.update({
                    where: { id: ticketId },
                    data: {
                        firstResponseAt:
                            complaint.firstResponseAt ?? now,
                        lastAdminReplyAt: now,
                        responsePending: false,
                    },
                });

                await tx.complaintHistory.create({
                    data: {
                        complaintId: ticketId,
                        actorType: ComplaintActorType.ADMIN,
                        actorAdminId: actorId,
                        action: "ADMIN_REPLIED",
                        oldValue: null,
                        newValue: JSON.stringify({
                            messageId: message.id.toString(),
                            messageType: ComplaintMessageType.MESSAGE,
                            hasAttachment: true,
                        }),
                    },
                });

                return message;
            });
        } catch (error) {
            try {
                await complaintAttachmentService.remove(
                    attachment.storageKey,
                );
            } catch (cleanupError) {
                throw new AggregateError(
                    [error, cleanupError],
                    "COMPLAINT_ATTACHMENT_TRANSACTION_AND_CLEANUP_FAILED",
                );
            }

            throw error;
        }
    }

    async getCustomerAttachment(
        attachmentId: string,
        accountId: string,
        platform: AccountPlatform,
    ) {
        this.validateCustomerPlatform(platform);

        if (
            !/^[1-9]\d*$/.test(attachmentId) ||
            !/^[1-9]\d*$/.test(accountId)
        ) {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        const attachment =
            await prisma.complaintAttachment.findFirst({
                where: {
                    id: BigInt(attachmentId),
                    message: {
                        messageType: ComplaintMessageType.MESSAGE,
                        deletedAt: null,
                        complaint: {
                            accountId: BigInt(accountId),
                        },
                    },
                },
                select: {
                    id: true,
                    originalName: true,
                    storageKey: true,
                    mimeType: true,
                    sizeBytes: true,
                    message: {
                        select: {
                            complaint: {
                                select: {
                                    account: {
                                        select: {
                                            platform: true,
                                            status: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

        if (
            !attachment ||
            attachment.message.complaint.account.platform !== platform ||
            attachment.message.complaint.account.status !== "ACTIVE"
        ) {
            throw new Error("COMPLAINT_ATTACHMENT_NOT_FOUND");
        }

        const buffer = await complaintAttachmentService.read(
            attachment.storageKey,
        );

        return {
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            buffer,
        };
    }

    async getAdminAttachment(
        attachmentId: string,
        adminId: string,
    ) {
        if (
            !/^[1-9]\d*$/.test(attachmentId) ||
            !/^[1-9]\d*$/.test(adminId)
        ) {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        const attachment =
            await prisma.complaintAttachment.findFirst({
                where: {
                    id: BigInt(attachmentId),
                    message: {
                        messageType: ComplaintMessageType.MESSAGE,
                        deletedAt: null,
                        complaint: {
                            assignments: {
                                some: {
                                    adminId: BigInt(adminId),
                                },
                            },
                        },
                    },
                },
                select: {
                    id: true,
                    originalName: true,
                    storageKey: true,
                    mimeType: true,
                    sizeBytes: true,
                },
            });

        if (!attachment) {
            throw new Error("COMPLAINT_ATTACHMENT_NOT_FOUND");
        }

        const actor = await prisma.adminAccount.findUnique({
            where: {
                id: BigInt(adminId),
            },
            select: {
                role: true,
                status: true,
            },
        });

        if (
            !actor ||
            actor.role !== AdminRole.ADMIN ||
            actor.status !== AdminStatus.ACTIVE
        ) {
            throw new Error("COMPLAINT_ACTOR_NOT_ACTIVE");
        }

        const buffer = await complaintAttachmentService.read(
            attachment.storageKey,
        );

        return {
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            buffer,
        };
    }

    async updateStatus(
        complaintId: string,
        actorAdminId: string,
        status: "IN_PROGRESS" | "RESOLVED" | "REJECTED",
        resolutionReason?: string,
    ) {
        if (!/^[1-9]\d*$/.test(complaintId)) {
            throw new Error("INVALID_COMPLAINT_ID");
        }

        if (!/^[1-9]\d*$/.test(actorAdminId)) {
            throw new Error("COMPLAINT_INVALID_ID");
        }

        if (
            status !== "IN_PROGRESS" &&
            status !== "RESOLVED" &&
            status !== "REJECTED"
        ) {
            throw new Error("COMPLAINT_INVALID_STATUS");
        }

        const normalizedReason =
            typeof resolutionReason === "string"
                ? resolutionReason.trim()
                : "";

        if (
            (status === "RESOLVED" || status === "REJECTED") &&
            !normalizedReason
        ) {
            throw new Error("COMPLAINT_RESOLUTION_REASON_REQUIRED");
        }

        return prisma.$transaction(async (tx) => {
            const ticketId = BigInt(complaintId);
            const actorId = BigInt(actorAdminId);

            await tx.$queryRaw`
                SELECT id
                FROM complaints
                WHERE id = ${ticketId}
                FOR UPDATE
            `;

            const complaint = await tx.complaint.findUnique({
                where: { id: ticketId },
                select: {
                    id: true,
                    status: true,
                    resolutionReason: true,
                    closedAt: true,
                    assignments: {
                        where: { adminId: actorId },
                        select: { adminId: true },
                    },
                },
            });

            if (!complaint) {
                throw new Error("COMPLAINT_NOT_FOUND");
            }

            if (
                complaint.status === ComplaintStatus.RESOLVED ||
                complaint.status === ComplaintStatus.REJECTED
            ) {
                throw new Error("COMPLAINT_ALREADY_CLOSED");
            }

            if (complaint.assignments.length === 0) {
                throw new Error("COMPLAINT_ADMIN_NOT_ASSIGNED");
            }

            const actor = await tx.adminAccount.findUnique({
                where: { id: actorId },
                select: {
                    id: true,
                    role: true,
                    status: true,
                },
            });

            if (
                !actor ||
                actor.role !== AdminRole.ADMIN ||
                actor.status !== AdminStatus.ACTIVE
            ) {
                throw new Error("COMPLAINT_ACTOR_NOT_ACTIVE");
            }

            const now = new Date();
            const isClosing =
                status === "RESOLVED" || status === "REJECTED";

            const updated = await tx.complaint.update({
                where: { id: ticketId },
                data: {
                    status,
                    resolutionReason: isClosing
                        ? normalizedReason
                        : null,
                    closedAt: isClosing ? now : null,
                    responsePending: isClosing
                        ? false
                        : undefined,
                },
                select: {
                    id: true,
                    ticketCode: true,
                    status: true,
                    resolutionReason: true,
                    closedAt: true,
                    responsePending: true,
                    updatedAt: true,
                },
            });

            await tx.complaintHistory.create({
                data: {
                    complaintId: ticketId,
                    actorType: ComplaintActorType.ADMIN,
                    actorAdminId: actorId,
                    action: "STATUS_CHANGED",
                    oldValue: JSON.stringify({
                        status: complaint.status,
                        resolutionReason: complaint.resolutionReason,
                        closedAt: complaint.closedAt?.toISOString() ?? null,
                    }),
                    newValue: JSON.stringify({
                        status,
                        resolutionReason: updated.resolutionReason,
                        closedAt: updated.closedAt?.toISOString() ?? null,
                    }),
                },
            });

            return updated;
        });
    }

}

export const complaintService = new ComplaintService();
