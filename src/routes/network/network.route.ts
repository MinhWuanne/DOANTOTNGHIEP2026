
import { FastifyInstance } from "fastify";
import { networkController } from "../../controllers/network/network.controller.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { accountOwnershipMiddleware } from "../../middlewares/auth/account-ownership.middleware.js";

export async function networkRoutes(app: FastifyInstance) {
  // GET /accounts/:accountId/network/direct
  app.get(
    "/accounts/:accountId/network/direct",
    {
      preHandler: [
        authMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        const accounts =
          await networkController.getDirectDownline(
            params.accountId,
          );

        return reply.send({
          success: true,
          data: accounts,
        });
      } catch (error) {
        return handleNetworkError(reply, error);
      }
    },
  );

  // GET /accounts/:accountId/network/all
  app.get(
    "/accounts/:accountId/network/all",
    {
      preHandler: [
        authMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        const accounts =
          await networkController.getAllDownline(
            params.accountId,
          );

        return reply.send({
          success: true,
          data: accounts,
        });
      } catch (error) {
        return handleNetworkError(reply, error);
      }
    },
  );

  // GET /accounts/:accountId/network/stats
  app.get(
    "/accounts/:accountId/network/stats",
    {
      preHandler: [
        authMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        const stats =
          await networkController.getDownlineStats(
            params.accountId,
          );

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        return handleNetworkError(reply, error);
      }
    },
  );
}

function handleNetworkError(
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
    ACCOUNT_NOT_FOUND: 404,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}

