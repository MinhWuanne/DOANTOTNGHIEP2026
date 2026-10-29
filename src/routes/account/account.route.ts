import { FastifyInstance } from "fastify";
import { AccountPlatform } from "../../generated/prisma/enums.js";
import { accountController } from "../../controllers/account/account.controller.js";

export async function accountRoutes(
  app: FastifyInstance,
) {
  app.post("/accounts", async (request, reply) => {
    try {
      const body = request.body as {
        personId: string | number;
        platform: AccountPlatform;
        email?: string | null;
        phone?: string | null;
        passwordHash: string;
        franchiseCode?: string;
      };

      const account =
        await accountController.createAccount(body);

      return reply.code(201).send({
        success: true,
        data: account,
      });
    } catch (error) {
      return handleAccountError(reply, error);
    }
  });

  app.get(
    "/accounts/:id",
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const account =
          await accountController.getAccountById(
            params.id,
          );

        if (!account) {
          return reply.code(404).send({
            success: false,
            error: "ACCOUNT_NOT_FOUND",
          });
        }

        return reply.send({
          success: true,
          data: account,
        });
      } catch (error) {
        return handleAccountError(reply, error);
      }
    },
  );

  app.get(
    "/persons/:personId/accounts/:platform",
    async (request, reply) => {
      try {
        const params = request.params as {
          personId: string;
          platform: AccountPlatform;
        };

        if (
          params.platform !== AccountPlatform.MEMBER &&
          params.platform !== AccountPlatform.FRANCHISE
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_PLATFORM",
          });
        }

        const account =
          await accountController.getAccountByPersonAndPlatform(
            params.personId,
            params.platform,
          );

        if (!account) {
          return reply.code(404).send({
            success: false,
            error: "ACCOUNT_NOT_FOUND",
          });
        }

        return reply.send({
          success: true,
          data: account,
        });
      } catch (error) {
        return handleAccountError(reply, error);
      }
    },
  );
}

function handleAccountError(
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

    PERSON_NOT_FOUND: 404,
    ACCOUNT_ALREADY_EXISTS_FOR_PLATFORM: 409,
    FRANCHISE_CODE_REQUIRED: 400,
    FRANCHISE_CODE_ALREADY_EXISTS: 409,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}