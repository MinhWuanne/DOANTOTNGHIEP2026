import { FastifyInstance } from "fastify";
import { AccountPlatform } from "../../generated/prisma/enums.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { returnController } from "../../controllers/return/return.controller.js";

export async function returnRoutes(app: FastifyInstance) {
  // GET /returns/my - Danh sách yêu cầu trả hàng của Member
  app.get(
    "/returns/my",
    { preHandler: [authMiddleware] },
    async (request: any, reply) => {
      try {
        if (request.auth.platform !== AccountPlatform.MEMBER) {
          return reply.code(403).send({
            success: false,
            error: "MEMBER_ACCOUNT_REQUIRED",
          });
        }

        const requests = await returnController.getMyReturnRequests(
          request.auth.accountId,
        );

        return reply.send({
          success: true,
          data: requests,
        });
      } catch (error) {
        return handleReturnError(reply, error);
      }
    },
  );

  // GET /returns/:id - Chi tiết yêu cầu trả hàng của Member
  app.get(
    "/returns/:id",
    { preHandler: [authMiddleware] },
    async (request: any, reply) => {
      try {
        if (request.auth.platform !== AccountPlatform.MEMBER) {
          return reply.code(403).send({
            success: false,
            error: "MEMBER_ACCOUNT_REQUIRED",
          });
        }

        const { id } = request.params as { id: string };

        const returnRequest =
          await returnController.getMyReturnRequestById(
            id,
            request.auth.accountId,
          );

        return reply.send({
          success: true,
          data: returnRequest,
        });
      } catch (error) {
        return handleReturnError(reply, error);
      }
    },
  );

  // POST /returns - Tạo yêu cầu trả hàng
  app.post(
    "/returns",
    { preHandler: [authMiddleware] },
    async (request: any, reply) => {
      try {
        if (request.auth.platform !== AccountPlatform.MEMBER) {
          return reply.code(403).send({
            success: false,
            error: "MEMBER_ACCOUNT_REQUIRED",
          });
        }

        const body = request.body as {
          orderId?: string | number;
          note?: string;
        };

        if (
          body?.orderId === undefined ||
          body?.orderId === null ||
          String(body.orderId).trim() === ""
        ) {
          return reply.code(400).send({
            success: false,
            error: "ORDER_ID_REQUIRED",
          });
        }

        if (
          body.note !== undefined &&
          typeof body.note !== "string"
        ) {
          return reply.code(400).send({
            success: false,
            error: "INVALID_RETURN_NOTE",
          });
        }

        const returnRequest =
          await returnController.createReturnRequest(
            body.orderId,
            request.auth.accountId,
            body.note,
          );

        return reply.code(201).send({
          success: true,
          data: returnRequest,
        });
      } catch (error) {
        return handleReturnError(reply, error);
      }
    },
  );
}

function handleReturnError(reply: any, error: unknown) {
  if (!(error instanceof Error)) {
    return reply.code(500).send({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });
  }

  const statusMap: Record<string, number> = {
    INVALID_ID: 400,
    ORDER_ID_REQUIRED: 400,
    INVALID_RETURN_NOTE: 400,

    ORDER_NOT_FOUND: 404,
    RETURN_REQUEST_NOT_FOUND: 404,

    ORDER_ACCESS_FORBIDDEN: 403,
    MEMBER_ACCOUNT_REQUIRED: 403,

    RETURN_REQUIRES_DELIVERED_ORDER: 400,
    ORDER_DELIVERED_AT_REQUIRED: 400,
    RETURN_REQUIRES_PAID_ORDER: 400,
    RETURN_REQUEST_ALREADY_EXISTS: 400,
    RETURN_WINDOW_EXPIRED: 400,
  };

  return reply
    .code(statusMap[error.message] ?? 500)
    .send({
      success: false,
      error: error.message,
    });
}
