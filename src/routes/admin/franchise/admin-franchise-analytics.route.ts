
import { FastifyInstance } from "fastify";

import { adminFranchiseAnalyticsController } from "../../../controllers/admin/franchise/admin-franchise-analytics.controller.js";

import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminFranchiseAnalyticsRoutes(
    app: FastifyInstance,
) {
    const adminAuth = {
        preHandler: [
            adminAuthMiddleware,
            adminOnlyMiddleware,
        ],
    };

    // ============================================================
    // OVERVIEW
    // ============================================================

    app.get(
        "/admin/franchises/overview",
        adminAuth,
        async (_request, reply) => {
            try {
                const overview =
                    await adminFranchiseAnalyticsController.getOverview();

                return reply.send({
                    success: true,
                    data: overview,
                });
            } catch (error) {
                return handleAdminFranchiseAnalyticsError(
                    reply,
                    error,
                );
            }
        },
    );

    // ============================================================
    // NETWORK
    // ============================================================

    app.get(
        "/admin/franchises/:id/network",
        adminAuth,
        async (request, reply) => {
            try {
                const params = request.params as {
                    id: string;
                };

                const network =
                    await adminFranchiseAnalyticsController.getNetwork(
                        params.id,
                    );

                return reply.send({
                    success: true,
                    data: network,
                });
            } catch (error) {
                return handleAdminFranchiseAnalyticsError(
                    reply,
                    error,
                );
            }
        },
    );

    // ============================================================
    // ANALYTICS
    // ============================================================

    app.get(
        "/admin/franchises/analytics",
        adminAuth,
        async (request, reply) => {
            try {
                const query = request.query as {
                    franchiseId?: string;
                    from?: string;
                    to?: string;
                    groupBy?: "hour" | "day";
                };

                const from =
                    query.from !== undefined
                        ? new Date(query.from)
                        : undefined;

                const to =
                    query.to !== undefined
                        ? new Date(query.to)
                        : undefined;

                if (
                    from !== undefined &&
                    Number.isNaN(from.getTime())
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_DATE",
                    });
                }

                if (
                    to !== undefined &&
                    Number.isNaN(to.getTime())
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_DATE",
                    });
                }

                if (
                    query.groupBy !== undefined &&
                    query.groupBy !== "hour" &&
                    query.groupBy !== "day"
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_GROUP_BY",
                    });
                }

                const analytics =
                    await adminFranchiseAnalyticsController.getAnalytics(
                        {
                            franchiseId:
                                query.franchiseId,
                            from,
                            to,
                            groupBy:
                                query.groupBy,
                        },
                    );

                return reply.send({
                    success: true,
                    data: analytics,
                });
            } catch (error) {
                return handleAdminFranchiseAnalyticsError(
                    reply,
                    error,
                );
            }
        },
    );

    // ============================================================
    // RANKING
    // ============================================================

    app.get(
        "/admin/franchises/ranking",
        adminAuth,
        async (request, reply) => {
            try {
                const query = request.query as {
                    sortBy?:
                        | "revenue"
                        | "orders"
                        | "commission"
                        | "network";
                    from?: string;
                    to?: string;
                    limit?: string;
                    offset?: string;
                };

                const sortBy =
                    query.sortBy ?? "revenue";

                if (
                    sortBy !== "revenue" &&
                    sortBy !== "orders" &&
                    sortBy !== "commission" &&
                    sortBy !== "network"
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_SORT_BY",
                    });
                }

                const from =
                    query.from !== undefined
                        ? new Date(query.from)
                        : undefined;

                const to =
                    query.to !== undefined
                        ? new Date(query.to)
                        : undefined;

                if (
                    from !== undefined &&
                    Number.isNaN(from.getTime())
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_DATE",
                    });
                }

                if (
                    to !== undefined &&
                    Number.isNaN(to.getTime())
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_DATE",
                    });
                }

                const limit =
                    query.limit !== undefined
                        ? Number(query.limit)
                        : 10;

                const offset =
                    query.offset !== undefined
                        ? Number(query.offset)
                        : 0;

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

                if (
                    !Number.isInteger(offset) ||
                    offset < 0
                ) {
                    return reply.code(400).send({
                        success: false,
                        error: "INVALID_OFFSET",
                    });
                }

                const ranking =
                    await adminFranchiseAnalyticsController.getRanking(
                        {
                            sortBy,
                            from,
                            to,
                            limit,
                            offset,
                        },
                    );

                return reply.send({
                    success: true,
                    data: ranking,
                });
            } catch (error) {
                return handleAdminFranchiseAnalyticsError(
                    reply,
                    error,
                );
            }
        },
    );
}

function handleAdminFranchiseAnalyticsError(
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
        FRANCHISE_NOT_FOUND: 404,
        INVALID_DATE: 400,
        INVALID_GROUP_BY: 400,
        INVALID_SORT_BY: 400,
        INVALID_LIMIT: 400,
        INVALID_OFFSET: 400,
    };

    const statusCode =
        statusMap[error.message] ?? 500;

    return reply.code(statusCode).send({
        success: false,
        error: error.message,
    });
}

