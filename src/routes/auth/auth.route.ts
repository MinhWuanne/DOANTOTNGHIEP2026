import { FastifyInstance } from "fastify";
import { authController } from "../../controllers/auth/auth.controller.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";

import { prisma } from "../../lib/prisma.js";
import { AccountPlatform } from "../../generated/prisma/enums.js";

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post(
    "/auth/register",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["fullName", "password"],
          properties: {
            fullName: {
              type: "string",
              minLength: 1,
              maxLength: 150,
            },
            email: {
              type: ["string", "null"],
            },
            phone: {
              type: ["string", "null"],
            },
            password: {
              type: "string",
              minLength: 8,
            },
            inviteCode: {
              type: ["string", "null"],
            },
          },
          anyOf: [
            { required: ["email"] },
            { required: ["phone"] },
          ],
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as {
          fullName: string;
          email?: string | null;
          phone?: string | null;
          password: string;
          inviteCode?: string | null;
        };

        const result =
          await authController.registerMember(body);

        return reply.code(201).send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAuthError(reply, error);
      }
    },
  );

  // POST /auth/login
  // MEMBER login
  app.post(
    "/auth/login",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["password"],
          properties: {
            email: {
              type: ["string", "null"],
            },
            phone: {
              type: ["string", "null"],
            },
            password: {
              type: "string",
              minLength: 8,
            },
          },
          anyOf: [
            { required: ["email"] },
            { required: ["phone"] },
          ],
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as {
          email?: string | null;
          phone?: string | null;
          password: string;
        };

        const result =
          await authController.login(body);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAuthError(reply, error);
      }
    },
  );

  // POST /auth/franchise/login
  // FRANCHISE login
  app.post(
    "/auth/franchise/login",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["password"],
          properties: {
            email: {
              type: ["string", "null"],
            },
            phone: {
              type: ["string", "null"],
            },
            password: {
              type: "string",
              minLength: 8,
            },
          },
          anyOf: [
            { required: ["email"] },
            { required: ["phone"] },
          ],
        },
      },
    },
    async (request, reply) => {
      try {
        const body = request.body as {
          email?: string | null;
          phone?: string | null;
          password: string;
        };

        const result =
          await authController.loginFranchise(body);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAuthError(reply, error);
      }
    },
  );

  // GET /auth/me
  app.get(
    "/auth/me",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      return reply.send({
        success: true,
        data: request.auth,
      });
    },
  );

  // GET /auth/franchise-invite
  // Get invite code of the authenticated Franchise account
  app.get(
    "/auth/franchise-invite",
    {
      preHandler: authMiddleware,
    },
    async (request, reply) => {
      try {
        if (
          request.auth.platform !==
          AccountPlatform.FRANCHISE
        ) {
          return reply.code(403).send({
            success: false,
            error: "FRANCHISE_ACCOUNT_REQUIRED",
          });
        }

        const profile =
          await prisma.franchiseProfile.findUnique({
            where: {
              accountId: BigInt(
                request.auth.accountId,
              ),
            },
            select: {
              franchiseCode: true,
            },
          });

        if (!profile) {
          return reply.code(404).send({
            success: false,
            error: "FRANCHISE_PROFILE_NOT_FOUND",
          });
        }

        return reply.send({
          success: true,
          data: {
            inviteCode: profile.franchiseCode,
          },
        });
      } catch (error) {
        request.log.error(error);

        return reply.code(500).send({
          success: false,
          error: "INTERNAL_SERVER_ERROR",
        });
      }
    },
  );
}

function handleAuthError(
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
    FULL_NAME_REQUIRED: 400,
    EMAIL_OR_PHONE_REQUIRED: 400,
    PASSWORD_TOO_SHORT: 400,
    INVITE_CODE_NOT_FOUND: 400,

    EMAIL_ALREADY_EXISTS: 409,
    PHONE_ALREADY_EXISTS: 409,

    INVALID_CREDENTIALS: 401,
    ACCOUNT_NOT_ACTIVE: 403,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}