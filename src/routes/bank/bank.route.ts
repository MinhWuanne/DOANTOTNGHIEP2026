import { FastifyInstance } from "fastify";
import {
  BankAccountOwnerType,
} from "../../generated/prisma/enums.js";
import { bankController } from "../../controllers/bank/bank.controller.js";

export async function bankRoutes(app: FastifyInstance) {
  // GET /bank/accounts
  app.get(
    "/bank/accounts",
    async (_request, reply) => {
      try {
        const accounts = await bankController.listAccounts();

        return reply.send({
          success: true,
          data: accounts.map((account) => ({
            ...account,
            id: account.id.toString(),
            ownerAccountId: account.ownerAccountId?.toString() ?? null,
            balance: account.balance.toString(),
          })),
        });
      } catch (error) {
        return handleBankError(reply, error);
      }
    },
  );

  // GET /bank/transactions?accountId=123
  app.get(
    "/bank/transactions",
    async (request, reply) => {
      try {
        const query = request.query as {
          accountId?: string;
        };

        if (
          query.accountId !== undefined &&
          !/^[1-9]\d*$/.test(query.accountId)
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_BANK_ACCOUNT_ID",
          });
        }

        const transactions = await bankController.listTransactions(
          query.accountId,
        );

        return reply.send({
          success: true,
          data: transactions.map((transaction) => ({
            ...transaction,
            id: transaction.id.toString(),
            fromBankAccountId:
              transaction.fromBankAccountId?.toString() ?? null,
            toBankAccountId:
              transaction.toBankAccountId?.toString() ?? null,
            paymentInstructionId:
              transaction.paymentInstructionId?.toString() ?? null,
            amount: transaction.amount.toString(),
            fromBankAccount: transaction.fromBankAccount
              ? {
                ...transaction.fromBankAccount,
                id: transaction.fromBankAccount.id.toString(),
              }
              : null,
            toBankAccount: transaction.toBankAccount
              ? {
                ...transaction.toBankAccount,
                id: transaction.toBankAccount.id.toString(),
              }
              : null,
          })),
        });
      } catch (error) {
        return handleBankError(reply, error);
      }
    },
  );

  // POST /bank/accounts
  app.post(
    "/bank/accounts",
    async (request, reply) => {
      try {
        const body = request.body as {
          ownerType: BankAccountOwnerType;
          ownerAccountId?: string | number;
        };

        const account = await bankController.createAccount(
          body.ownerType,
          body.ownerAccountId,
        );

        return reply.code(201).send({
          success: true,
          data: account,
        });
      } catch (error) {
        return handleBankError(reply, error);
      }
    },
  );

  // GET /bank/accounts/:id
  app.get(
    "/bank/accounts/:id",
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const account = await bankController.getAccount(params.id);

        return reply.send({
          success: true,
          data: account,
        });
      } catch (error) {
        return handleBankError(reply, error);
      }
    },
  );

  // GET /bank/accounts/:id/balance
  app.get(
    "/bank/accounts/:id/balance",
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const balance = await bankController.getBalance(params.id);

        return reply.send({
          success: true,
          data: {
            balance,
          },
        });
      } catch (error) {
        return handleBankError(reply, error);
      }
    },
  );

  // POST /bank/accounts/:id/deposit
  app.post(
    "/bank/accounts/:id/deposit",
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = request.body as {
          amount: number;
          description?: string;
        };

        const account = await bankController.deposit(
          params.id,
          body.amount,
          body.description,
        );

        return reply.send({
          success: true,
          data: account,
        });
      } catch (error) {
        return handleBankError(reply, error);
      }
    },
  );

  // POST /bank/transfers
  app.post(
    "/bank/transfers",
    async (request, reply) => {
      try {
        const body = request.body as {
          fromBankAccountId: string | number;
          toBankAccountId: string | number;
          amount: number;
          description?: string;
        };

        const account = await bankController.transfer(
          body.fromBankAccountId,
          body.toBankAccountId,
          body.amount,
          body.description,
        );

        return reply.send({
          success: true,
          data: account,
        });
      } catch (error) {
        return handleBankError(reply, error);
      }
    },
  );
}

function handleBankError(reply: any, error: unknown) {
  if (!(error instanceof Error)) {
    return reply.code(500).send({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });
  }

  const statusMap: Record<string, number> = {
    BANK_ACCOUNT_ALREADY_EXISTS: 400,
    BANK_ACCOUNT_NOT_FOUND: 404,
    BANK_ACCOUNT_NOT_ACTIVE: 400,
    INVALID_AMOUNT: 400,
    BANK_SELF_TRANSFER_NOT_ALLOWED: 400,
    INSUFFICIENT_BANK_BALANCE: 400,
    INVALID_BANK_ACCOUNT_ID: 400,
  };

  const statusCode = statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}