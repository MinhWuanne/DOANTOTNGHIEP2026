import { FastifyInstance } from "fastify";
import { walletController } from "../../controllers/wallet/wallet.controller.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { accountOwnershipMiddleware } from "../../middlewares/auth/account-ownership.middleware.js";


import {
  paymentController,
} from "../../controllers/payment/payment.controller.js";

export async function walletRoutes(app: FastifyInstance) {
  // GET /wallets/:accountId
  app.get(
    "/wallets/:accountId",
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

        const wallet = await walletController.getWallet(
          params.accountId,
        );

        return reply.send({
          success: true,
          data: wallet,
        });
      } catch (error) {
        return handleWalletError(reply, error);
      }
    },
  );

  // GET /wallets/:accountId/balance
  app.get(
    "/wallets/:accountId/balance",
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

        const balance = await walletController.getBalance(
          params.accountId,
        );

        return reply.send({
          success: true,
          data: balance,
        });
      } catch (error) {
        return handleWalletError(reply, error);
      }
    },
  );

  // GET /wallets/:accountId/transactions
  app.get(
    "/wallets/:accountId/transactions",
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

        const transactions =
          await walletController.getTransactions(
            params.accountId,
          );

        return reply.send({
          success: true,
          data: transactions,
        });
      } catch (error) {
        return handleWalletError(reply, error);
      }
    },
  );

  // GET /wallets/:accountId/bank-accounts
  app.get(
    "/wallets/:accountId/bank-accounts",
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

        const bankAccounts =
          await walletController.getWithdrawalBankAccounts(
            params.accountId,
          );

        return reply.send({
          success: true,
          data: bankAccounts,
        });
      } catch (error) {
        return handleWalletError(reply, error);
      }
    },
  );

  // POST /wallets/:accountId/top-up-instruction
  app.post(
    "/wallets/:accountId/top-up-instruction",
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

        const body = request.body as {
          amount?: string | number;
        };

        if (
          body?.amount === undefined ||
          body.amount === null ||
          String(body.amount).trim() === ""
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_AMOUNT",
          });
        }

        const instruction =
          await paymentController.createWalletTopUpInstruction(
            params.accountId,
            body.amount,
          );

        return reply.code(201).send({
          success: true,
          data: instruction,
        });
      } catch (error) {
        return handleWalletError(reply, error);
      }
    },
  );

  // POST /wallets/:accountId/top-up
  app.post(
    "/wallets/:accountId/top-up",
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

        const body = request.body as {
          amount: string | number;
          description?: string;
        };

        const wallet = await walletController.topUp(
          params.accountId,
          {
            amount: body.amount,
            description: body.description,
          },
        );

        return reply.send({
          success: true,
          data: wallet,
        });
      } catch (error) {
        return handleWalletError(reply, error);
      }
    },
  );

  // POST /wallets/:accountId/withdrawals
  app.post(
    "/wallets/:accountId/withdrawals",
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

        const body = request.body as {
          bankAccountId: string | number;
          amount: string | number;
          note?: string;
        };

        const withdrawal =
          await walletController.createWithdrawalRequest(
            params.accountId,
            {
              bankAccountId: body.bankAccountId,
              amount: body.amount,
              note: body.note,
            },
          );

        return reply.code(201).send({
          success: true,
          data: withdrawal,
        });
      } catch (error) {
        return handleWalletError(reply, error);
      }
    },
  );
}

function handleWalletError(
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
    ACCOUNT_NOT_FOUND: 404,
    BANK_ACCOUNT_NOT_FOUND: 404,

    INVALID_AMOUNT: 400,
    INSUFFICIENT_BALANCE: 400,
    INSUFFICIENT_AVAILABLE_BALANCE: 400,
    INVALID_BANK_ACCOUNT_OWNER: 400,
    BANK_ACCOUNT_NOT_BELONG_TO_ACCOUNT: 400,


    MEMBER_ACCOUNT_REQUIRED: 403,
    ACCOUNT_NOT_ACTIVE: 403,
    PAYMENT_INSTRUCTION_CONTENT_GENERATION_FAILED: 500,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}