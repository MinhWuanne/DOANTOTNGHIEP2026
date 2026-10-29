import { FastifyReply, FastifyRequest } from "fastify";
import {
  adminAuthService,
  AdminJwtPayload,
} from "../../services/admin/auth/admin-auth.service.js";
import { prisma } from "../../lib/prisma.js";
import { AdminStatus } from "../../generated/prisma/enums.js";

declare module "fastify" {
  interface FastifyRequest {
    adminAuth: AdminJwtPayload;
  }
}

export async function adminAuthMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {

  console.log(
    "[ADMIN AUTH]",
    request.method,
    request.url,
    "authorization:",
    Boolean(request.headers.authorization),
  );
  const authorization = request.headers.authorization;

  if (!authorization) {
    return reply.code(401).send({
      success: false,
      error: "ADMIN_AUTHORIZATION_REQUIRED",
    });
  }

  if (!authorization.startsWith("Bearer ")) {
    return reply.code(401).send({
      success: false,
      error: "INVALID_ADMIN_AUTHORIZATION_FORMAT",
    });
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return reply.code(401).send({
      success: false,
      error: "ADMIN_TOKEN_REQUIRED",
    });
  }

  try {
    const payload = adminAuthService.verify(token);

    const admin = await prisma.adminAccount.findUnique({
      where: {
        id: BigInt(payload.adminId),
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!admin) {
      return reply.code(401).send({
        success: false,
        error: "ADMIN_ACCOUNT_NOT_FOUND",
      });
    }

    if (admin.status !== AdminStatus.ACTIVE) {
      return reply.code(401).send({
        success: false,
        error: "ADMIN_ACCOUNT_NOT_ACTIVE",
      });
    }

    request.adminAuth = {
      adminId: admin.id.toString(),
      role: admin.role,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "INVALID_ADMIN_TOKEN";

    return reply.code(401).send({
      success: false,
      error: errorMessage,
    });
  }
}