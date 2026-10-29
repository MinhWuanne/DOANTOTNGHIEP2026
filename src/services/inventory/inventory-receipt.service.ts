
import { prisma } from "../../lib/prisma.js";
import {
    InventoryReceiptStatus,
    Prisma,
} from "../../generated/prisma/client.js";

export interface GetInventoryReceiptsQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: InventoryReceiptStatus | "ALL";
}

export interface CreateInventoryReceiptItemInput {
    variantId: bigint | number;
    quantity: number;
}

export interface CreateInventoryReceiptInput {
    note?: string;
    createdById: bigint | number;
    items: CreateInventoryReceiptItemInput[];
}

export class InventoryReceiptService {

    // =====================================================
    // Get Receipts - Pagination, Search, Filter, Summary
    // =====================================================

    async getReceipts(
        query: GetInventoryReceiptsQuery = {},
    ) {
        const page =
            Number.isInteger(query.page) && query.page! > 0
                ? query.page!
                : 1;

        const limit =
            Number.isInteger(query.limit) && query.limit! > 0
                ? Math.min(query.limit!, 50)
                : 10;

        const search = query.search?.trim() ?? "";
        const status = query.status ?? "ALL";

        const where: Prisma.InventoryReceiptWhereInput = {};

        if (status !== "ALL") {
            where.status = status;
        }

        if (search) {
            where.OR = [
                {
                    receiptNumber: {
                        contains: search,
                    },
                },
                {
                    createdBy: {
                        is: {
                            username: {
                                contains: search,
                            },
                        },
                    },
                },
                {
                    items: {
                        some: {
                            variant: {
                                is: {
                                    OR: [
                                        {
                                            name: {
                                                contains: search,
                                            },
                                        },
                                        {
                                            sku: {
                                                contains: search,
                                            },
                                        },
                                        {
                                            product: {
                                                is: {
                                                    name: {
                                                        contains: search,
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
            ];
        }

        const [
            items,
            filteredTotal,
            total,
            draft,
            confirmed,
            cancelled,
        ] = await Promise.all([
            prisma.inventoryReceipt.findMany({
                where,
                orderBy: {
                    id: "desc",
                },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            username: true,
                            role: true,
                        },
                    },
                    items: {
                        orderBy: {
                            id: "asc",
                        },
                        include: {
                            variant: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    status: true,
                                    product: {
                                        select: {
                                            id: true,
                                            name: true,
                                            slug: true,
                                            status: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),

            prisma.inventoryReceipt.count({
                where,
            }),

            prisma.inventoryReceipt.count(),

            prisma.inventoryReceipt.count({
                where: {
                    status: InventoryReceiptStatus.DRAFT,
                },
            }),

            prisma.inventoryReceipt.count({
                where: {
                    status: InventoryReceiptStatus.CONFIRMED,
                },
            }),

            prisma.inventoryReceipt.count({
                where: {
                    status: InventoryReceiptStatus.CANCELLED,
                },
            }),
        ]);

        return {
            items,
            pagination: {
                page,
                limit,
                total: filteredTotal,
                totalPages: Math.ceil(filteredTotal / limit),
            },
            summary: {
                total,
                draft,
                confirmed,
                cancelled,
            },
        };
    }

    // =====================================================
    // Get Receipt By ID
    // =====================================================

    async getReceiptById(
        receiptId: bigint | number,
    ) {
        const id = BigInt(receiptId);

        const receipt =
            await prisma.inventoryReceipt.findUnique({
                where: {
                    id,
                },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            username: true,
                            role: true,
                        },
                    },
                    items: {
                        orderBy: {
                            id: "asc",
                        },
                        include: {
                            variant: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    status: true,
                                    product: {
                                        select: {
                                            id: true,
                                            name: true,
                                            slug: true,
                                            status: true,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            });

        if (!receipt) {
            throw new Error("INVENTORY_RECEIPT_NOT_FOUND");
        }

        return receipt;
    }

    // =====================================================
    // Create Receipt
    // =====================================================

    async createReceipt(
        input: CreateInventoryReceiptInput,
    ) {
        const createdById = BigInt(input.createdById);

        if (!Array.isArray(input.items) || input.items.length === 0) {
            throw new Error("INVENTORY_RECEIPT_ITEMS_REQUIRED");
        }

        if (
            input.note !== undefined &&
            input.note !== null &&
            typeof input.note !== "string"
        ) {
            throw new Error("INVALID_INVENTORY_RECEIPT_NOTE");
        }

        const normalizedNote =
            input.note?.trim() || undefined;

        const normalizedItems =
            input.items.map((item) => {
                const variantId = BigInt(item.variantId);
                const quantity = item.quantity;

                if (
                    !Number.isInteger(quantity) ||
                    quantity <= 0
                ) {
                    throw new Error(
                        "INVALID_INVENTORY_RECEIPT_QUANTITY",
                    );
                }

                return {
                    variantId,
                    quantity,
                };
            });

        const variantIds =
            normalizedItems.map(
                (item) => item.variantId.toString(),
            );

        if (
            new Set(variantIds).size !== variantIds.length
        ) {
            throw new Error(
                "DUPLICATE_INVENTORY_RECEIPT_VARIANT",
            );
        }

        const admin =
            await prisma.adminAccount.findUnique({
                where: {
                    id: createdById,
                },
                select: {
                    id: true,
                    status: true,
                    role: true,
                },
            });

        if (!admin) {
            throw new Error("ADMIN_ACCOUNT_NOT_FOUND");
        }

        if (admin.status !== "ACTIVE") {
            throw new Error("ADMIN_ACCOUNT_DISABLED");
        }

        if (admin.role !== "ADMIN") {
            throw new Error("ADMIN_ROLE_REQUIRED");
        }

        const variants =
            await prisma.productVariant.findMany({
                where: {
                    id: {
                        in: normalizedItems.map(
                            (item) => item.variantId,
                        ),
                    },
                },
                select: {
                    id: true,
                },
            });

        if (
            variants.length !== normalizedItems.length
        ) {
            throw new Error(
                "PRODUCT_VARIANT_NOT_FOUND",
            );
        }

        const inventories =
            await prisma.inventory.findMany({
                where: {
                    variantId: {
                        in: normalizedItems.map(
                            (item) => item.variantId,
                        ),
                    },
                },
                select: {
                    variantId: true,
                },
            });

        if (
            inventories.length !== normalizedItems.length
        ) {
            throw new Error("INVENTORY_NOT_FOUND");
        }

        const receiptNumber =
            await this.generateReceiptNumber();

        return prisma.inventoryReceipt.create({
            data: {
                receiptNumber,
                status: InventoryReceiptStatus.DRAFT,
                note: normalizedNote,
                createdById,
                items: {
                    create: normalizedItems.map((item) => ({
                        variantId: item.variantId,
                        quantity: item.quantity,
                    })),
                },
            },
            include: {
                items: true,
            },
        });
    }

    // =====================================================
    // Confirm Receipt
    // =====================================================

    async confirmReceipt(
        receiptId: bigint | number,
    ) {
        const id = BigInt(receiptId);

        return prisma.$transaction(async (tx) => {
            const receipt =
                await tx.inventoryReceipt.findUnique({
                    where: {
                        id,
                    },
                    include: {
                        items: {
                            orderBy: {
                                id: "asc",
                            },
                        },
                    },
                });

            if (!receipt) {
                throw new Error(
                    "INVENTORY_RECEIPT_NOT_FOUND",
                );
            }

            if (
                receipt.status !==
                InventoryReceiptStatus.DRAFT
            ) {
                throw new Error(
                    "INVENTORY_RECEIPT_NOT_DRAFT",
                );
            }

            if (receipt.items.length === 0) {
                throw new Error(
                    "INVENTORY_RECEIPT_ITEMS_REQUIRED",
                );
            }

            for (const item of receipt.items) {
                const affectedRows =
                    await tx.$executeRaw`
            UPDATE inventories
            SET quantity = quantity + ${item.quantity}
            WHERE variantId = ${item.variantId}
          `;

                if (affectedRows !== 1) {
                    throw new Error(
                        "INVENTORY_NOT_FOUND",
                    );
                }
            }

            return tx.inventoryReceipt.update({
                where: {
                    id,
                },
                data: {
                    status:
                        InventoryReceiptStatus.CONFIRMED,
                    confirmedAt: new Date(),
                },
                include: {
                    items: true,
                },
            });
        });
    }

    // =====================================================
    // Cancel Receipt
    // =====================================================

    async cancelReceipt(
        receiptId: bigint | number,
    ) {
        const id = BigInt(receiptId);

        const receipt =
            await prisma.inventoryReceipt.findUnique({
                where: {
                    id,
                },
                select: {
                    id: true,
                    status: true,
                },
            });

        if (!receipt) {
            throw new Error(
                "INVENTORY_RECEIPT_NOT_FOUND",
            );
        }

        if (
            receipt.status !==
            InventoryReceiptStatus.DRAFT
        ) {
            throw new Error(
                "INVENTORY_RECEIPT_NOT_DRAFT",
            );
        }

        return prisma.inventoryReceipt.update({
            where: {
                id,
            },
            data: {
                status:
                    InventoryReceiptStatus.CANCELLED,
            },
            include: {
                items: true,
            },
        });
    }

    // =====================================================
    // Receipt Number
    // =====================================================

    private async generateReceiptNumber() {
        const year = new Date()
            .getFullYear();

        const latest =
            await prisma.inventoryReceipt.findFirst({
                orderBy: {
                    id: "desc",
                },
                select: {
                    id: true,
                },
            });

        const sequence =
            latest !== null
                ? Number(latest.id) + 1
                : 1;

        return `REC-${year}-${String(sequence).padStart(6, "0")}`;
    }
}

export const inventoryReceiptService =
    new InventoryReceiptService();