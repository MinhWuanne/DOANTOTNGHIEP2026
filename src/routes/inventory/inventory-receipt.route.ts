
import {
    FastifyInstance,
} from "fastify";

import {
    InventoryReceiptStatus,
} from "../../generated/prisma/client.js";

import {
    inventoryReceiptController,
} from "../../controllers/inventory/inventory-receipt.controller.js";

import {
    adminAuthMiddleware,
} from "../../middlewares/admin/admin-auth.middleware.js";

import {
    adminOnlyMiddleware,
} from "../../middlewares/admin/admin-only.middleware.js";

export async function inventoryReceiptRoutes(
    app: FastifyInstance,
) {
    const adminAuth = {
        preHandler: [
            adminAuthMiddleware,
            adminOnlyMiddleware,
        ],
    };

    // =====================================================
    // GET /inventory-receipts
    // Pagination, search, status filter, global summary
    // =====================================================

    app.get(
        "/inventory-receipts",
        adminAuth,
        async (request, reply) => {
            try {
                const query = request.query as {
                    page?: string;
                    limit?: string;
                    search?: string;
                    status?: string;
                };

                const page =
                    query.page === undefined
                        ? 1
                        : Number(query.page);

                const limit =
                    query.limit === undefined
                        ? 10
                        : Number(query.limit);

                if (
                    !Number.isInteger(page) ||
                    page < 1
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_PAGE",
                    });
                }

                if (
                    !Number.isInteger(limit) ||
                    limit < 1 ||
                    limit > 50
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_LIMIT",
                    });
                }

                const search =
                    typeof query.search === "string"
                        ? query.search.trim()
                        : "";

                const allowedStatuses = [
                    "ALL",
                    InventoryReceiptStatus.DRAFT,
                    InventoryReceiptStatus.CONFIRMED,
                    InventoryReceiptStatus.CANCELLED,
                ];

                const status =
                    query.status ?? "ALL";

                if (
                    !allowedStatuses.includes(
                        status as typeof allowedStatuses[number],
                    )
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_INVENTORY_RECEIPT_STATUS",
                    });
                }

                const result =
                    await inventoryReceiptController.getReceipts({
                        page,
                        limit,
                        search,
                        status: status as
                            | InventoryReceiptStatus
                            | "ALL",
                    });

                return reply.send({
                    success: true,
                    data: result,
                });
            } catch (error) {
                return handleInventoryReceiptError(
                    reply,
                    error,
                );
            }
        },
    );

    // =====================================================
    // GET /inventory-receipts/:id
    // =====================================================

    app.get(
        "/inventory-receipts/:id",
        adminAuth,
        async (request, reply) => {
            try {
                const params =
                    request.params as {
                        id: string;
                    };

                const receipt =
                    await inventoryReceiptController.getReceiptById(
                        params.id,
                    );

                return reply.send({
                    success: true,
                    data: receipt,
                });
            } catch (error) {
                return handleInventoryReceiptError(
                    reply,
                    error,
                );
            }
        },
    );

    // =====================================================
    // POST /inventory-receipts
    // =====================================================

    app.post(
        "/inventory-receipts",
        adminAuth,
        async (request, reply) => {
            try {
                const body =
                    request.body as {
                        note?: string;
                        items: Array<{
                            variantId: string | number;
                            quantity: number;
                        }>;
                    };

                const receipt =
                    await inventoryReceiptController.createReceipt(
                        request.adminAuth.adminId,
                        body,
                    );

                return reply.code(201).send({
                    success: true,
                    data: receipt,
                });
            } catch (error) {
                return handleInventoryReceiptError(
                    reply,
                    error,
                );
            }
        },
    );

    // =====================================================
    // POST /inventory-receipts/:id/confirm
    // =====================================================

    app.post(
        "/inventory-receipts/:id/confirm",
        adminAuth,
        async (request, reply) => {
            try {
                const params =
                    request.params as {
                        id: string;
                    };

                const receipt =
                    await inventoryReceiptController.confirmReceipt(
                        params.id,
                    );

                return reply.send({
                    success: true,
                    data: receipt,
                });
            } catch (error) {
                return handleInventoryReceiptError(
                    reply,
                    error,
                );
            }
        },
    );

    // =====================================================
    // POST /inventory-receipts/:id/cancel
    // =====================================================

    app.post(
        "/inventory-receipts/:id/cancel",
        adminAuth,
        async (request, reply) => {
            try {
                const params =
                    request.params as {
                        id: string;
                    };

                const receipt =
                    await inventoryReceiptController.cancelReceipt(
                        params.id,
                    );

                return reply.send({
                    success: true,
                    data: receipt,
                });
            } catch (error) {
                return handleInventoryReceiptError(
                    reply,
                    error,
                );
            }
        },
    );
}

function handleInventoryReceiptError(
    reply: any,
    error: unknown,
) {
    if (!(error instanceof Error)) {
        return reply.code(500).send({
            success: false,
            error: "INTERNAL_SERVER_ERROR",
        });
    }

    const statusMap: Record<string, number> = {
        INVALID_ID: 400,

        INVENTORY_RECEIPT_ITEMS_REQUIRED: 400,
        INVALID_INVENTORY_RECEIPT_NOTE: 400,
        INVALID_INVENTORY_RECEIPT_QUANTITY: 400,
        DUPLICATE_INVENTORY_RECEIPT_VARIANT: 400,

        ADMIN_ACCOUNT_NOT_FOUND: 404,
        ADMIN_ACCOUNT_DISABLED: 403,
        ADMIN_ROLE_REQUIRED: 403,

        PRODUCT_VARIANT_NOT_FOUND: 404,
        INVENTORY_NOT_FOUND: 404,

        INVENTORY_RECEIPT_NOT_FOUND: 404,
        INVENTORY_RECEIPT_NOT_DRAFT: 409,
    };

    const statusCode =
        statusMap[error.message] ?? 500;

    return reply.code(statusCode).send({
        success: false,
        error: error.message,
    });
}