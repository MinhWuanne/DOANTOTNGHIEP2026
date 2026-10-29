
import { FastifyInstance } from "fastify";
import { PaymentStatus } from "../../generated/prisma/enums.js";
import { paymentController } from "../../controllers/payment/payment.controller.js";

import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { orderAccessOwnershipMiddleware } from "../../middlewares/auth/order-access-ownership.middleware.js";
import { adminAuthMiddleware } from "../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../middlewares/admin/admin-only.middleware.js";

export async function paymentRoutes(app: FastifyInstance) {
  // GET /orders/:id/payment
  app.get(
    "/orders/:id/payment",
    {
      preHandler: [
        authMiddleware,
        orderAccessOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as { id: string };

        const payment = await paymentController.getOrderPayment(
          params.id,
        );

        return reply.send({
          success: true,
          data: payment,
        });
      } catch (error) {
        return handlePaymentError(reply, error);
      }
    },
  );


  // GET /orders/:id/payment-instruction
  app.get(
    "/orders/:id/payment-instruction",
    {
      preHandler: [
        authMiddleware,
        orderAccessOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const accountId = request.auth?.accountId;

        if (!accountId) {
          return reply.code(401).send({
            success: false,
            error: "AUTHORIZATION_REQUIRED",
          });
        }

        const instruction =
          await paymentController
            .getOrCreateOrderPaymentInstruction(
              params.id,
              accountId,
            );

        return reply.send({
          success: true,
          data: instruction,
        });
      } catch (error) {
        return handlePaymentError(reply, error);
      }
    },
  );

  // GET /admin/payments/bank-transactions/pending
  app.get(
    "/admin/payments/bank-transactions/pending",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (_request, reply) => {
      try {
        const transactions =
          await paymentController.listPendingBankTransactions();

        return reply.send({
          success: true,
          data: transactions,
        });
      } catch (error) {
        return handlePaymentError(reply, error);
      }
    },
  );


  // POST /admin/payments/bank-transactions/:id/process
  app.post(
    "/admin/payments/bank-transactions/:id/process",
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

        const result =
          await paymentController.processBankTransaction(
            params.id,
          );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handlePaymentError(reply, error);
      }
    },
  );


  // PATCH /orders/:id/payment-status
  app.patch(
    "/orders/:id/payment-status",
    {
      preHandler: [
        adminAuthMiddleware,
        adminOnlyMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as { id: string };

        const body = request.body as {
          status: PaymentStatus;
        };

        const payment =
          await paymentController.updatePaymentStatus(
            params.id,
            {
              status: body.status,
            },
          );

        return reply.send({
          success: true,
          data: payment,
        });
      } catch (error) {
        return handlePaymentError(reply, error);
      }
    },
  );
}

function handlePaymentError(reply: any, error: unknown) {
  if (!(error instanceof Error)) {
    return reply.code(500).send({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });
  }

  const statusMap: Record<string, number> = {
    ORDER_NOT_FOUND: 404,
    INVALID_PAYMENT_ID: 400,
    INVALID_PAYMENT_STATUS: 400,
    INVALID_PAYMENT_STATUS_TRANSITION: 400,
    PAYMENT_OPERATION_NOT_ALLOWED: 400,
    COD_PAYMENT_REQUIRES_DELIVERED_ORDER: 400,
    ONLINE_PAYMENT_NOT_SUPPORTED: 400,

    ORDER_ACCESS_FORBIDDEN: 403,
    MEMBER_ACCOUNT_REQUIRED: 403,
    BANK_TRANSFER_PAYMENT_REQUIRED: 400,
    ORDER_NOT_PAYABLE: 400,
    ORDER_ALREADY_PAID: 400,
    ACTIVE_PAYMENT_INSTRUCTION_ALREADY_EXISTS: 409,
    SHOP_BANK_ACCOUNT_NOT_FOUND: 500,
    PAYMENT_INSTRUCTION_NOT_FOUND: 404,

    BANK_TRANSACTION_NOT_FOUND: 404,
    BANK_TRANSACTION_NOT_TRANSFER: 400,
    BANK_TRANSACTION_CONTENT_REQUIRED: 400,
    BANK_TRANSACTION_ALREADY_PROCESSED: 409,
    PAYMENT_INSTRUCTION_NOT_ACTIVE: 400,
    BANK_TRANSACTION_RECIPIENT_MISMATCH: 400,
    BANK_TRANSACTION_AMOUNT_MISMATCH: 400,
    BANK_TRANSACTION_AFTER_EXPIRY: 400,
    ORDER_CANCELLED: 400,
    ORDER_PAYMENT_METHOD_MISMATCH: 400,
    ORDER_STATE_CHANGED: 409,
    ORDER_PROCESSING_FAILED: 500,
    WALLET_NOT_FOUND: 404,
    UNSUPPORTED_PAYMENT_INSTRUCTION_TYPE: 400,
  };

  const statusCode = statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}

