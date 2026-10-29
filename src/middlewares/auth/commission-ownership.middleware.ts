import {
  FastifyReply,
  FastifyRequest,
} from "fastify";

import { prisma } from "../../lib/prisma.js";

export async function commissionOwnershipMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.auth) {
    return reply.code(401).send({
      success: false,
      error: "AUTHORIZATION_REQUIRED",
    });
  }

  const commissionId = (request.params as {
    id?: string;
  }).id;

  if (!commissionId) {
    return reply.code(400).send({
      success: false,
      error: "COMMISSION_ID_REQUIRED",
    });
  }

  let id: bigint;

  try {
    id = BigInt(commissionId);
  } catch {
    return reply.code(400).send({
      success: false,
      error: "INVALID_COMMISSION_ID",
    });
  }

  const commission =
    await prisma.commissionTransaction.findUnique({
      where: {
        id,
      },
      select: {
        accountId: true,
      },
    });

  if (!commission) {
    return reply.code(404).send({
      success: false,
      error: "COMMISSION_NOT_FOUND",
    });
  }

  if (
    commission.accountId.toString() !==
    request.auth.accountId
  ) {
    return reply.code(403).send({
      success: false,
      error: "COMMISSION_ACCESS_FORBIDDEN",
    });
  }
}