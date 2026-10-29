
import {
    AccountPlatform,
} from "../../generated/prisma/enums.js";

import {
    complaintService,
} from "../../services/complaint/complaint.service.js";

import {
    complaintAttachmentService,
} from "../../services/complaint/complaint-attachment.service.js";

export interface CreateComplaintRequest {
    category: string;
    subject: string;
    content: string;
}

export class ComplaintController {
    async create(
        accountId: string,
        platform: AccountPlatform,
        input: CreateComplaintRequest,
    ) {
        return complaintService.create({
            accountId,
            platform,
            category: input.category,
            subject: input.subject,
            content: input.content,
        });
    }

    async listOwn(
        accountId: string,
        platform: AccountPlatform,
    ) {
        return complaintService.listOwn(
            accountId,
            platform,
        );
    }

    async getOwn(
        accountId: string,
        platform: AccountPlatform,
        complaintId: string,
    ) {
        return complaintService.getOwn(
            accountId,
            platform,
            complaintId,
        );
    }

    async sendCustomerMessage(
        complaintId: string,
        accountId: string,
        platform: AccountPlatform,
        input: {
            content: string;
        },
    ) {
        return complaintService.sendCustomerMessage(
            complaintId,
            accountId,
            platform,
            input.content,
        );
    }

    async sendCustomerMessageWithAttachment(
        complaintId: string,
        accountId: string,
        platform: AccountPlatform,
        input: {
            content: string;
            originalName: string;
            mimeType: string;
            buffer: Buffer;
        },
    ) {
        const attachment =
            await complaintAttachmentService.store({
                originalName: input.originalName,
                mimeType: input.mimeType,
                buffer: input.buffer,
            });

        return complaintService.sendCustomerMessageWithAttachment(
            complaintId,
            accountId,
            platform,
            input.content,
            attachment,
        );
    }

    async sendAdminMessageWithAttachment(
        complaintId: string,
        actorAdminId: string,
        input: {
            content: string;
            originalName: string;
            mimeType: string;
            buffer: Buffer;
        },
    ) {
        const attachment =
            await complaintAttachmentService.store({
                originalName: input.originalName,
                mimeType: input.mimeType,
                buffer: input.buffer,
            });

        return complaintService.sendAdminMessageWithAttachment(
            complaintId,
            actorAdminId,
            input.content,
            attachment,
        );
    }

    async downloadCustomerAttachment(
        attachmentId: string,
        accountId: string,
        platform: AccountPlatform,
    ) {
        return complaintService.getCustomerAttachment(
            attachmentId,
            accountId,
            platform,
        );
    }

    async downloadAdminAttachment(
        attachmentId: string,
        adminId: string,
    ) {
        return complaintService.getAdminAttachment(
            attachmentId,
            adminId,
        );
    }

    async listAdmin(input: {
        status?: string;
        category?: string;
        search?: string;
        page?: number;
        pageSize?: number;
    }) {
        return complaintService.listAdmin(input);
    }

    async getAdmin(complaintId: string) {
        return complaintService.getAdmin(complaintId);
    }

    async assignAdmin(
        complaintId: string,
        adminId: string,
        actorAdminId: string,
    ) {
        return complaintService.assignAdmin(
            complaintId,
            adminId,
            actorAdminId,
        );
    }

    async sendAdminMessage(
        complaintId: string,
        actorAdminId: string,
        input: {
            content: string;
            messageType?: "MESSAGE" | "INTERNAL_NOTE";
        },
    ) {
        return complaintService.sendAdminMessage(
            complaintId,
            actorAdminId,
            input.content,
            input.messageType,
        );
    }

    async recallAdminMessage(
        complaintId: string,
        messageId: string,
        actorAdminId: string,
    ) {
        return complaintService.recallAdminMessage(
            complaintId,
            messageId,
            actorAdminId,
        );
    }

    async updateStatus(
        complaintId: string,
        actorAdminId: string,
        input: {
            status: "IN_PROGRESS" | "RESOLVED" | "REJECTED";
            resolutionReason?: string;
        },
    ) {
        return complaintService.updateStatus(
            complaintId,
            actorAdminId,
            input.status,
            input.resolutionReason,
        );
    }

}

export const complaintController =
    new ComplaintController();
