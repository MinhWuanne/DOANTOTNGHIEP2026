import { FastifyInstance } from "fastify";
import { commissionController } from "../../controllers/commission/commission.controller.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { adminAuthMiddleware } from "../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../middlewares/admin/admin-only.middleware.js";
import { commissionOwnershipMiddleware } from "../../middlewares/auth/commission-ownership.middleware.js";

import { franchiseOnlyMiddleware } from "../../middlewares/auth/platform.middleware.js";
export async function commissionRoutes(
  app: FastifyInstance,
) {
  // POST /commissions
  // Chỉ ADMIN được tạo Commission.
  app.post(
    "/commissions",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const body = request.body as {
          orderId?: string | number;
          sourceType?: string;
        };

        if (
          body.orderId === undefined ||
          body.orderId === null ||
          body.orderId === ""
        ) {
          return reply.code(400).send({
            success: false,
            error: "ORDER_ID_REQUIRED",
          });
        }

        try {
          BigInt(body.orderId);
        } catch {
          return reply.code(400).send({
            success: false,
            error: "INVALID_ORDER_ID",
          });
        }

        if (!body.sourceType) {
          return reply.code(400).send({
            success: false,
            error: "SOURCE_TYPE_REQUIRED",
          });
        }

        if (
          body.sourceType !== "MEMBER_ORDER" &&
          body.sourceType !== "FRANCHISE_ORDER"
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_SOURCE_TYPE",
          });
        }

        const commission =
          await commissionController.createCommission({
            orderId: body.orderId,
            sourceType: body.sourceType,
          });

        return reply.code(201).send({
          success: true,
          data: commission,
        });
      } catch (error) {
        return handleCommissionError(
          reply,
          error,
        );
      }
    },
  );

  // GET /commissions/:id
  // MEMBER/FRANCHISE chỉ được xem Commission của chính mình.
  app.get(
    "/commissions/:id",
    {
      preHandler: [
        authMiddleware,
        commissionOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const commission =
          await commissionController.getCommissionById(
            params.id,
          );

        if (!commission) {
          return reply.code(404).send({
            success: false,
            error: "COMMISSION_NOT_FOUND",
          });
        }

        return reply.send({
          success: true,
          data: commission,
        });
      } catch (error) {
        return handleCommissionError(
          reply,
          error,
        );
      }
    },
  );

  // GET /commissions/eligibility/:orderId
  // Kiểm tra eligibility là nghiệp vụ Commission,
  // chỉ ADMIN được gọi trực tiếp qua route này.
  app.get(
    "/commissions/eligibility/:orderId",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          orderId: string;
        };

        try {
          BigInt(params.orderId);
        } catch {
          return reply.code(400).send({
            success: false,
            error: "INVALID_ORDER_ID",
          });
        }

        const eligible =
          await commissionController.checkCommissionEligibility(
            params.orderId,
          );

        return reply.send({
          success: true,
          data: {
            eligible,
          },
        });
      } catch (error) {
        return handleCommissionError(
          reply,
          error,
        );
      }
    },
  );

  // PATCH /commissions/:id/approve
  // Chỉ ADMIN được duyệt Commission.
  app.patch(
    "/commissions/:id/approve",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        try {
          BigInt(params.id);
        } catch {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMMISSION_ID",
          });
        }

        const commission =
          await commissionController.approveCommission(
            params.id,
          );

        return reply.send({
          success: true,
          data: commission,
        });
      } catch (error) {
        return handleCommissionError(
          reply,
          error,
        );
      }
    },
  );

  // PATCH /commissions/:id/pay
  // Chỉ ADMIN được thanh toán Commission.
  app.patch(
    "/commissions/:id/pay",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        try {
          BigInt(params.id);
        } catch {
          return reply.code(400).send({
            success: false,
            error: "INVALID_COMMISSION_ID",
          });
        }

        const commission =
          await commissionController.payCommission(
            params.id,
          );

        return reply.send({
          success: true,
          data: commission,
        });
      } catch (error) {
        return handleCommissionError(
          reply,
          error,
        );
      }
    },
  );

  // ============================================================
  // GET FRANCHISE COMMISSIONS
  // Franchise chỉ xem được hoa hồng của tài khoản mình.
  // ============================================================
  app.get(
    "/franchise/commissions",
    {
      preHandler: [
        authMiddleware,
        franchiseOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const query = request.query as {
          period?: string;
          from?: string;
          to?: string;
        };

        const allowedPeriods = [
          "today",
          "7days",
          "week",
          "month",
          "year",
          "custom",
        ];

        const period = query.period ?? "month";

        if (!allowedPeriods.includes(period)) {
          return reply.code(400).send({
            success: false,
            message: "INVALID_COMMISSION_PERIOD",
          });
        }

        if (
          period === "custom" &&
          (!query.from || !query.to)
        ) {
          return reply.code(400).send({
            success: false,
            message: "INVALID_COMMISSION_DATE_RANGE",
          });
        }

        const accountId = request.auth?.accountId;

        if (!accountId) {
          return reply.code(401).send({
            success: false,
            message: "UNAUTHORIZED",
          });
        }

        const data =
          await commissionController.getFranchiseCommissions(
            accountId,
            period as
            | "today"
            | "7days"
            | "week"
            | "month"
            | "year"
            | "custom",
            query.from,
            query.to,
          );

        return reply.code(200).send({
          success: true,
          data,
        });
      } catch (error) {
        return handleCommissionError(reply, error);
      }
    },
  );
}

function handleCommissionError(
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
    ORDER_NOT_FOUND: 404,
    ACCOUNT_NOT_FOUND: 404,
    COMMISSION_RULE_NOT_FOUND: 404,
    COMMISSION_NOT_FOUND: 404,

    COMMISSION_ALREADY_EXISTS: 409,

    DIRECT_REFERRER_NOT_FOUND: 400,
    SOURCE_TYPE_PLATFORM_MISMATCH: 400,
    INVALID_COMMISSION_BASE: 400,
    INVALID_COMMISSION_PERIOD: 400,
    INVALID_COMMISSION_DATE_RANGE: 400,
    FRANCHISE_NOT_ACTIVE: 400,

    COMMISSION_NOT_ELIGIBLE: 400,
    INVALID_COMMISSION_STATUS_TRANSITION: 400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}