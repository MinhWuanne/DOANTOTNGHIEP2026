import { FastifyInstance } from "fastify";
import { adminUserAccountController } from "../../../controllers/admin/user-account/admin-user-account.controller.js";
import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminUserAccountRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  app.get(
    "/admin/user-accounts",
    adminAuth,
    async (_request, reply) => {
      try {
        const accounts =
          await adminUserAccountController.getUserAccounts();

        return reply.send({
          success: true,
          data: accounts,
        });
      } catch (error) {
        return handleAdminUserAccountError(
          reply,
          error,
        );
      }
    },
  );

  app.get(
    "/admin/user-accounts/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const account =
          await adminUserAccountController.getUserAccountById(
            params.id,
          );

        return reply.send({
          success: true,
          data: account,
        });
      } catch (error) {
        return handleAdminUserAccountError(
          reply,
          error,
        );
      }
    },
  );

  app.patch(
    "/admin/user-accounts/:id/lock",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const account =
          await adminUserAccountController.lockUserAccount(
            params.id,
          );

        return reply.send({
          success: true,
          data: account,
        });
      } catch (error) {
        return handleAdminUserAccountError(
          reply,
          error,
        );
      }
    },
  );

  app.patch(
    "/admin/user-accounts/:id/unlock",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const account =
          await adminUserAccountController.unlockUserAccount(
            params.id,
          );

        return reply.send({
          success: true,
          data: account,
        });
      } catch (error) {
        return handleAdminUserAccountError(
          reply,
          error,
        );
      }
    },
  );
}

function handleAdminUserAccountError(
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
    ACCOUNT_NOT_FOUND: 404,
    ACCOUNT_ALREADY_LOCKED: 400,
    ACCOUNT_ALREADY_ACTIVE: 400,
    INVALID_ACCOUNT_STATUS: 400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}