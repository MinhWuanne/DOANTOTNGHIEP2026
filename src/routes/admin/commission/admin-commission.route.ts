import { FastifyInstance } from "fastify";

import { adminCommissionController } from "../../../controllers/admin/commission/admin-commission.controller.js";

import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminCommissionRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  // GET /admin/commissions
  app.get(
    "/admin/commissions",
    adminAuth,
    async (_request, reply) => {
      try {
        const commissions =
          await adminCommissionController.getCommissions();

        return reply.send({
          success: true,
          data: commissions,
        });
      } catch (error) {
        return handleAdminCommissionError(
          reply,
          error,
        );
      }
    },
  );
}

function handleAdminCommissionError(
  reply: any,
  error: unknown,
) {
  if (!(error instanceof Error)) {
    return reply.code(500).send({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });
  }

  return reply.code(500).send({
    success: false,
    error: error.message,
  });
}