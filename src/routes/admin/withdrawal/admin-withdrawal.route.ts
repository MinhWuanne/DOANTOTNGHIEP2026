import { FastifyInstance } from "fastify";
import { adminWithdrawalController } from "../../../controllers/admin/withdrawal/admin-withdrawal.controller.js";
import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminWithdrawalRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  // GET /admin/withdrawals
  app.get(
    "/admin/withdrawals",
    adminAuth,
    async (_request, reply) => {
      try {
        const withdrawals =
          await adminWithdrawalController.getWithdrawals();

        return reply.send({
          success: true,
          data: withdrawals,
        });
      } catch (error) {
        return handleAdminWithdrawalError(
          reply,
          error,
        );
      }
    },
  );

  // GET /admin/withdrawals/:id
  app.get(
    "/admin/withdrawals/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const withdrawal =
          await adminWithdrawalController.getWithdrawalById(
            params.id,
          );

        return reply.send({
          success: true,
          data: withdrawal,
        });
      } catch (error) {
        return handleAdminWithdrawalError(
          reply,
          error,
        );
      }
    },
  );

  // PATCH /admin/withdrawals/:id/approve
  app.patch(
    "/admin/withdrawals/:id/approve",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const withdrawal =
          await adminWithdrawalController.approveWithdrawal(
            params.id,
          );

        return reply.send({
          success: true,
          data: withdrawal,
        });
      } catch (error) {
        return handleAdminWithdrawalError(
          reply,
          error,
        );
      }
    },
  );

  // PATCH /admin/withdrawals/:id/reject
  app.patch(
    "/admin/withdrawals/:id/reject",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = request.body as {
          note?: string;
        };

        const withdrawal =
          await adminWithdrawalController.rejectWithdrawal(
            params.id,
            body?.note,
          );

        return reply.send({
          success: true,
          data: withdrawal,
        });
      } catch (error) {
        return handleAdminWithdrawalError(
          reply,
          error,
        );
      }
    },
  );

  // PATCH /admin/withdrawals/:id/complete
  app.patch(
    "/admin/withdrawals/:id/complete",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const withdrawal =
          await adminWithdrawalController.completeWithdrawal(
            params.id,
          );

        return reply.send({
          success: true,
          data: withdrawal,
        });
      } catch (error) {
        return handleAdminWithdrawalError(
          reply,
          error,
        );
      }
    },
  );
}

function handleAdminWithdrawalError(
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

    WITHDRAWAL_NOT_FOUND: 404,

    INVALID_WITHDRAWAL_STATUS_TRANSITION: 409,

    BANK_ACCOUNT_NOT_FOUND: 404,
    INVALID_BANK_ACCOUNT_OWNER: 400,
    BANK_ACCOUNT_NOT_BELONG_TO_ACCOUNT: 403,
    BANK_ACCOUNT_NOT_ACTIVE: 409,

    SHOP_BANK_ACCOUNT_NOT_FOUND: 404,
    BANK_SELF_TRANSFER_NOT_ALLOWED: 400,

    INSUFFICIENT_BALANCE: 409,
    INSUFFICIENT_SHOP_BANK_BALANCE: 409,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}