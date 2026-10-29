
import { FastifyInstance } from "fastify";
import { adminWalletController } from "../../../controllers/admin/wallet/admin-wallet.controller.js";
import { financialAdjustmentController } from "../../../controllers/admin/wallet/financial-adjustment.controller.js";
import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminWalletRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  // ============================================================
  // GET /admin/wallets
  // ============================================================
  app.get(
    "/admin/wallets",
    adminAuth,
    async (request, reply) => {
      try {
        const query = request.query as {
          page?: string;
          limit?: string;
          search?: string;
          platform?: string;
          status?: string;
          sortBy?: string;
          sortOrder?: string;
        };

        const page = Number(query.page ?? 1);
        const limit = Number(query.limit ?? 20);

        if (
          !Number.isInteger(page) ||
          page < 1 ||
          !Number.isInteger(limit) ||
          ![10, 20, 50].includes(limit)
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_PAGINATION",
          });
        }

        if (
          query.platform &&
          !["MEMBER", "FRANCHISE"].includes(
            query.platform,
          )
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_PLATFORM",
          });
        }

        if (
          query.status &&
          !["ACTIVE", "INACTIVE", "LOCKED"].includes(
            query.status,
          )
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_ACCOUNT_STATUS",
          });
        }

        if (
          query.sortBy &&
          !["createdAt", "balance"].includes(
            query.sortBy,
          )
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_SORT_BY",
          });
        }

        if (
          query.sortOrder &&
          !["asc", "desc"].includes(
            query.sortOrder,
          )
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_SORT_ORDER",
          });
        }

        const result =
          await adminWalletController.getWallets({
            page,
            limit,
            search: query.search?.trim() || undefined,
            platform: query.platform as
              | "MEMBER"
              | "FRANCHISE"
              | undefined,
            status: query.status as
              | "ACTIVE"
              | "INACTIVE"
              | "LOCKED"
              | undefined,
            sortBy: query.sortBy as
              | "createdAt"
              | "balance"
              | undefined,
            sortOrder: query.sortOrder as
              | "asc"
              | "desc"
              | undefined,
          });

        return reply.send({
          success: true,
          ...result,
        });
      } catch (error) {
        return handleAdminWalletError(reply, error);
      }
    },
  );

  // ============================================================
  // GET /admin/wallets/:accountId
  // ============================================================
  app.get(
    "/admin/wallets/:accountId",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        const wallet =
          await adminWalletController.getWalletByAccountId(
            params.accountId,
          );

        return reply.send({
          success: true,
          data: wallet,
        });
      } catch (error) {
        return handleAdminWalletError(reply, error);
      }
    },
  );

  // ============================================================
  // GET /admin/wallets/:accountId/transactions
  // ============================================================
  app.get(
    "/admin/wallets/:accountId/transactions",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        const transactions =
          await adminWalletController.getTransactions(
            params.accountId,
          );

        return reply.send({
          success: true,
          data: transactions,
        });
      } catch (error) {
        return handleAdminWalletError(reply, error);
      }
    },
  );

  // ============================================================
  // GET /admin/financial-adjustments
  // ============================================================
  app.get(
    "/admin/financial-adjustments",
    adminAuth,
    async (request, reply) => {
      try {
        const query = request.query as {
          page?: string;
          limit?: string;
          search?: string;
          status?: string;
        };

        const page = Number(query.page ?? 1);
        const limit = Number(query.limit ?? 20);

        if (
          !Number.isInteger(page) ||
          page < 1 ||
          !Number.isInteger(limit) ||
          ![10, 20, 50].includes(limit)
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_PAGINATION",
          });
        }

        if (
          query.status &&
          !financialAdjustmentController.isValidStatus(
            query.status,
          )
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_ADJUSTMENT_STATUS",
          });
        }

        const result =
          await financialAdjustmentController.listAdjustments({
            page,
            limit,
            search: query.search?.trim() || undefined,
            status: query.status as
              | "PENDING"
              | "COMPLETED"
              | "EXPIRED"
              | undefined,
          });

        return reply.send({
          success: true,
          ...result,
        });
      } catch (error) {
        return handleFinancialAdjustmentError(reply, error);
      }
    },
  );

  // ============================================================
  // GET /admin/financial-adjustments/:ticketCode
  // ============================================================
  app.get(
    "/admin/financial-adjustments/:ticketCode",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          ticketCode: string;
        };

        const adjustment =
          await financialAdjustmentController.getAdjustment(
            params.ticketCode,
          );

        return reply.send({
          success: true,
          data: adjustment,
        });
      } catch (error) {
        return handleFinancialAdjustmentError(reply, error);
      }
    },
  );


  // ============================================================
  // POST /admin/financial-adjustments
  // Create PENDING ticket; do not change wallet balance.
  // ============================================================
  app.post(
    "/admin/financial-adjustments",
    adminAuth,
    async (request, reply) => {
      try {
        const body = request.body as {
          recipientAccountId?: unknown;
          complaintId?: unknown;
          direction?: unknown;
          amount?: unknown;
          reason?: unknown;
          note?: unknown;
        };

        if (
          typeof body?.recipientAccountId !== "string" ||
          !financialAdjustmentController.isValidDirection(
            body?.direction,
          ) ||
          !financialAdjustmentController.isValidReason(
            body?.reason,
          ) ||
          (typeof body?.amount !== "string" &&
            typeof body?.amount !== "number") ||
          (body?.note !== undefined &&
            body?.note !== null &&
            typeof body.note !== "string")
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_ADJUSTMENT_INPUT",
          });
        }

        const adjustment =
          await financialAdjustmentController.createAdjustment(
            {
              recipientAccountId: body.recipientAccountId,
              ...(typeof body.complaintId === "string"
                ? { complaintId: body.complaintId }
                : {}),
              direction: body.direction,
              amount: body.amount,
              reason: body.reason,
              note: body.note as string | null | undefined,
            },
      request.adminAuth.adminId,
          );

  return reply.code(201).send({
    success: true,
    data: adjustment,
  });
} catch (error) {
  return handleFinancialAdjustmentError(reply, error);
}
    },
  );


// ============================================================
// POST /admin/financial-adjustments/:ticketCode/confirm
// Confirm with the current ADMIN account password.
// ============================================================
app.post(
  "/admin/financial-adjustments/:ticketCode/confirm",
  adminAuth,
  async (request, reply) => {
    try {
      const params = request.params as {
        ticketCode: string;
      };

      const body = request.body as {
        password?: unknown;
      };

      if (
        typeof body?.password !== "string" ||
        !body.password
      ) {
        return reply.code(400).send({
          success: false,
          error: "ADMIN_PASSWORD_REQUIRED",
        });
      }

      const adjustment =
        await financialAdjustmentController.confirmAdjustment(
          params.ticketCode,
          request.adminAuth.adminId,
          body.password,
        );

      return reply.send({
        success: true,
        data: adjustment,
      });
    } catch (error) {
      return handleFinancialAdjustmentError(reply, error);
    }
  },
);
}

function handleAdminWalletError(
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
    WALLET_NOT_FOUND: 404,
  };

  const statusCode = statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}

function handleFinancialAdjustmentError(
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
    INVALID_ACCOUNT_ID: 400,
    INVALID_ADJUSTMENT_TICKET_CODE: 400,
    INVALID_ADJUSTMENT_AMOUNT: 400,
    INVALID_ADJUSTMENT_DIRECTION: 400,
    INVALID_ADJUSTMENT_REASON: 400,
    INVALID_ADJUSTMENT_INPUT: 400,
    INVALID_ADJUSTMENT_STATUS: 400,
    ADJUSTMENT_NOTE_REQUIRED: 400,
    ADMIN_PASSWORD_REQUIRED: 400,

    ADMIN_ACCOUNT_NOT_ACTIVE: 401,
    ADMIN_PASSWORD_INVALID: 401,

    ADMIN_ROLE_NOT_ALLOWED: 403,

    ADJUSTMENT_RECIPIENT_NOT_FOUND: 404,
    ADJUSTMENT_NOT_FOUND: 404,
    WALLET_NOT_FOUND: 404,

    ADJUSTMENT_ALREADY_PROCESSED: 409,
    ADJUSTMENT_EXPIRED: 409,
    INSUFFICIENT_AVAILABLE_BALANCE: 409,
    INVALID_ADJUSTMENT_BALANCE: 409,
    WALLET_BALANCE_CHANGED_RETRY: 409,
    INVALID_ADJUSTMENT_RECIPIENT: 400,

    COMPLAINT_NOT_FOUND: 404,
    COMPLAINT_RECIPIENT_MISMATCH: 400,
    COMPLAINT_ALREADY_RESOLVED: 409,
  };

  const statusCode = statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}
