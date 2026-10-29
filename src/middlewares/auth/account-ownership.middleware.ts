
import { FastifyReply, FastifyRequest } from "fastify";

export async function accountOwnershipMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.auth) {
    return reply.code(401).send({
      success: false,
      error: "AUTHORIZATION_REQUIRED",
    });
  }

  const accountId = (request.params as {
    accountId?: string;
  }).accountId;

  if (!accountId) {
    return reply.code(400).send({
      success: false,
      error: "ACCOUNT_ID_REQUIRED",
    });
  }

  if (accountId !== request.auth.accountId) {
    return reply.code(403).send({
      success: false,
      error: "ACCOUNT_ACCESS_FORBIDDEN",
    });
  }
}

