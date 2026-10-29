import { FastifyReply, FastifyRequest } from "fastify";

import { prisma } from "../../lib/prisma.js";

function parseOrderId(id: unknown): bigint {
  if (typeof id !== "string" && typeof id !== "number") {
    throw new Error("INVALID_ORDER_ID");
  }

  const value = String(id).trim();

  if (!/^\d+$/.test(value) || value === "0") {
    throw new Error("INVALID_ORDER_ID");
  }

  try {
    return BigInt(value);
  } catch {
    throw new Error("INVALID_ORDER_ID");
  }
}

export async function orderAccessOwnershipMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.auth) {
    return reply.code(401).send({
      success: false,
      error: "AUTHORIZATION_REQUIRED",
    });
  }

  const params = request.params as {
    id?: string;
  };

  const orderId = params?.id;

  if (!orderId) {
    return reply.code(400).send({
      success: false,
      error: "ORDER_ID_REQUIRED",
    });
  }

  let parsedOrderId: bigint;

  try {
    parsedOrderId = parseOrderId(orderId);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_ORDER_ID"
    ) {
      return reply.code(400).send({
        success: false,
        error: "INVALID_ORDER_ID",
      });
    }

    throw error;
  }

  const order = await prisma.order.findUnique({
    where: {
      id: parsedOrderId,
    },
    select: {
      accountId: true,
    },
  });

  if (!order) {
    return reply.code(404).send({
      success: false,
      error: "ORDER_NOT_FOUND",
    });
  }

  if (
    order.accountId !==
    BigInt(request.auth.accountId)
  ) {
    return reply.code(403).send({
      success: false,
      error: "ORDER_ACCESS_FORBIDDEN",
    });
  }
}