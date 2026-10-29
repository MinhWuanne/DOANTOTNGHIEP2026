import {
  FastifyInstance,
} from "fastify";

import {
  inventoryIssueController,
} from "../../controllers/inventory/inventory-issue.controller.js";

import {
  adminAuthMiddleware,
} from "../../middlewares/admin/admin-auth.middleware.js";

import {
  adminOnlyMiddleware,
} from "../../middlewares/admin/admin-only.middleware.js";

export async function inventoryIssueRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  // =====================================================
  // GET /inventory-issues
  // =====================================================

  app.get(
    "/inventory-issues",
    adminAuth,
    async (request, reply) => {
      try {
        const query = request.query as {
          page?: string;
          limit?: string;
          search?: string;
          status?: string;
        };

        const parsedPage = Number(query.page ?? 1);
        const parsedLimit = Number(query.limit ?? 10);

        if (
          !Number.isInteger(parsedPage) ||
          parsedPage < 1 ||
          !Number.isInteger(parsedLimit) ||
          parsedLimit < 1
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_PAGINATION",
          });
        }

        if (
          query.status &&
          query.status !== "COMPLETED"
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_STATUS",
          });
        }

        const result =
          await inventoryIssueController.getIssues({
            page: parsedPage,
            limit: Math.min(parsedLimit, 50),
            search: query.search,
            status: query.status,
          });

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleInventoryIssueError(
          reply,
          error,
        );
      }
    },
  );

  // =====================================================
  // GET /inventory-issues/:id
  // =====================================================

  app.get(
    "/inventory-issues/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params =
          request.params as {
            id: string;
          };

        const issue =
          await inventoryIssueController.getIssueById(
            params.id,
          );

        return reply.send({
          success: true,
          data: issue,
        });
      } catch (error) {
        return handleInventoryIssueError(
          reply,
          error,
        );
      }
    },
  );
}

function handleInventoryIssueError(
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

    INVENTORY_ISSUE_NOT_FOUND: 404,

    ADMIN_ACCOUNT_NOT_FOUND: 404,
    ADMIN_ACCOUNT_DISABLED: 403,
    ADMIN_ROLE_REQUIRED: 403,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}