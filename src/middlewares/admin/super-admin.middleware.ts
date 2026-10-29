import { FastifyReply, FastifyRequest } from "fastify";
import { AdminRole } from "../../generated/prisma/enums.js";

export async function superAdminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.adminAuth) {
    return reply.code(401).send({
      success: false,
      error: "ADMIN_AUTHORIZATION_REQUIRED",
    });
  }

  if (request.adminAuth.role !== AdminRole.SUPER_ADMIN) {
    return reply.code(403).send({
      success: false,
      error: "SUPER_ADMIN_REQUIRED",
    });
  }
}