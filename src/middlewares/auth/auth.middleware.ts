import { FastifyReply, FastifyRequest } from "fastify";
import { jwtService, JwtPayload } from "../../services/auth/jwt.service.js";
import { prisma } from "../../lib/prisma.js";
import { AccountPlatform, UserStatus } from "../../generated/prisma/enums.js";

declare module "fastify" {
  interface FastifyRequest {
    auth: JwtPayload;
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return reply.code(401).send({
      success: false,
      error: "AUTHORIZATION_REQUIRED",
    });
  }

  if (!authorization.startsWith("Bearer ")) {
    return reply.code(401).send({
      success: false,
      error: "INVALID_AUTHORIZATION_FORMAT",
    });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return reply.code(401).send({
      success: false,
      error: "TOKEN_REQUIRED",
    });
  }

  try {
    const payload = jwtService.verify(token);

    const account = await prisma.userAccount.findUnique({
      where: {
        id: BigInt(payload.accountId),
      },
      select: {
        id: true,
        personId: true,
        platform: true,
        status: true,
      },
    });

    if (!account) {
      return reply.code(401).send({
        success: false,
        error: "ACCOUNT_NOT_FOUND",
      });
    }

    if (account.status !== UserStatus.ACTIVE) {
      return reply.code(401).send({
        success: false,
        error: "ACCOUNT_NOT_ACTIVE",
      });
    }

    if (
      account.personId.toString() !== payload.personId ||
      account.platform !== payload.platform
    ) {
      return reply.code(401).send({
        success: false,
        error: "INVALID_TOKEN",
      });
    }

    request.auth = {
      accountId: account.id.toString(),
      personId: account.personId.toString(),
      platform: account.platform as AccountPlatform,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "INVALID_TOKEN";

    return reply.code(401).send({
      success: false,
      error: errorMessage,
    });
  }
}