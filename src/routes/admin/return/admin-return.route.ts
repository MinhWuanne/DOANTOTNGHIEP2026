
import { FastifyInstance } from "fastify";
import { ReturnStatus } from "../../../generated/prisma/enums.js";
import { adminReturnController } from "../../../controllers/admin/return/admin-return.controller.js";
import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminReturnRoutes(
    app: FastifyInstance,
) {
    const adminAuth = {
        preHandler: [
            adminAuthMiddleware,
            adminOnlyMiddleware,
        ],
    };

    // GET /admin/returns
    app.get(
        "/admin/returns",
        adminAuth,
        async (request, reply) => {
            try {
                const query = request.query as {
                    status?: string;
                };

                let status: ReturnStatus | undefined;

                if (query.status !== undefined) {
                    if (
                        !Object.values(ReturnStatus).includes(
                            query.status as ReturnStatus,
                        )
                    ) {
                        return reply.code(400).send({
                            success: false,
                            error: "INVALID_RETURN_STATUS",
                        });
                    }

                    status = query.status as ReturnStatus;
                }

                const returns =
                    await adminReturnController.getReturnRequests(
                        status,
                    );

                return reply.send({
                    success: true,
                    data: returns,
                });
            } catch (error) {
                return handleAdminReturnError(
                    reply,
                    error,
                );
            }
        },
    );

    // GET /admin/returns/:id
    app.get(
        "/admin/returns/:id",
        adminAuth,
        async (request, reply) => {
            try {
                const params = request.params as {
                    id: string;
                };

                const returnRequest =
                    await adminReturnController.getReturnRequestById(
                        params.id,
                    );

                return reply.send({
                    success: true,
                    data: returnRequest,
                });
            } catch (error) {
                return handleAdminReturnError(
                    reply,
                    error,
                );
            }
        },
    );


    // PATCH /admin/returns/:id/approve
    app.patch(
        "/admin/returns/:id/approve",
        adminAuth,
        async (request, reply) => {
            try {
                const params = request.params as {
                    id: string;
                };

                const returnRequest =
                    await adminReturnController.approveReturn(
                        params.id,
                    );

                return reply.send({
                    success: true,
                    data: returnRequest,
                });
            } catch (error) {
                console.error(
                    "[ADMIN_RETURN_APPROVE_ERROR]",
                    error,
                );

                return handleAdminReturnError(
                    reply,
                    error,
                );
            }
        },
    );

    // PATCH /admin/returns/:id/reject
    app.patch(
        "/admin/returns/:id/reject",
        adminAuth,
        async (request, reply) => {
            try {
                const params = request.params as {
                    id: string;
                };

                const body = (request.body ?? {}) as {
                    note?: string;
                };

                if (
                    body.note !== undefined &&
                    (
                        typeof body.note !== "string" ||
                        body.note.length > 255
                    )
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_RETURN_NOTE",
                    });
                }

                const returnRequest =
                    await adminReturnController.rejectReturn(
                        params.id,
                        body.note,
                    );

                return reply.send({
                    success: true,
                    data: returnRequest,
                });
            } catch (error) {
                return handleAdminReturnError(
                    reply,
                    error,
                );
            }
        },
    );

}

function handleAdminReturnError(
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
        INVALID_RETURN_NOTE: 400,
        INVALID_RETURN_STATUS_TRANSITION: 409,
        INVALID_PAYMENT_STATUS_TRANSITION: 409,
        INVALID_ORDER_STATUS_TRANSITION: 409,

        ORDER_NOT_FOUND: 404,
        RETURN_REQUEST_NOT_FOUND: 404,

        RETURN_REQUIRES_DELIVERED_ORDER: 409,
        ORDER_DELIVERED_AT_REQUIRED: 409,
        RETURN_REQUIRES_PAID_ORDER: 409,
        MEMBER_ACCOUNT_REQUIRED: 409,
        RETURN_COMMISSION_ALREADY_PAID: 409,
    };


    const statusCode =
        statusMap[error.message] ?? 500;

    return reply.code(statusCode).send({
        success: false,
        error: error.message,
    });
}
