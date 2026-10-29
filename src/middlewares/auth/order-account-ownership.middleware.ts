import { FastifyReply, FastifyRequest } from "fastify";
import { parsePositiveId } from "../../utils/parse-positive-id.js";

export async function orderAccountOwnershipMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.auth) {
    return reply.code(401).send({
      success: false,
      error: "AUTHORIZATION_REQUIRED",
    });
  }

  const body = request.body as {
    accountId?: string | number;
  };

  const accountId = body?.accountId;

  if (
    accountId === undefined ||
    accountId === null
  ) {
    return reply.code(400).send({
      success: false,
      error: "ACCOUNT_ID_REQUIRED",
    });
  }

  try {
    parsePositiveId(String(accountId));
  } catch {
    return reply.code(400).send({
      success: false,
      error: "INVALID_ID",
    });
  }

  if (
    String(accountId) !==
    request.auth.accountId
  ) {
    return reply.code(403).send({
      success: false,
      error: "ORDER_ACCOUNT_ACCESS_FORBIDDEN",
    });
  }
}