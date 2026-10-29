import { FastifyReply, FastifyRequest } from "fastify";
import { AdminRole } from "../../generated/prisma/enums.js";

export async function adminOnlyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.adminAuth) {
    return reply.code(401).send({
      success: false,
      error: "ADMIN_AUTHORIZATION_REQUIRED",
    });
  }

  if (request.adminAuth.role !== AdminRole.ADMIN) {
    return reply.code(403).send({
      success: false,
      error: "ADMIN_ONLY_REQUIRED",
    });
  }
}