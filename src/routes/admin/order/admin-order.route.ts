
import { FastifyInstance } from "fastify";
import { OrderStatus } from "../../../generated/prisma/enums.js";
import { adminOrderController } from "../../../controllers/admin/order/admin-order.controller.js";
import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminOrderRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  // GET /admin/orders
  app.get(
    "/admin/orders",
    adminAuth,
    async (_request, reply) => {
      try {
        const orders =
          await adminOrderController.getOrders();

        return reply.send({
          success: true,
          data: orders,
        });
      } catch (error) {
        return handleAdminOrderError(
          reply,
          error,
        );
      }
    },
  );

  // GET /admin/orders/:id
  app.get(
    "/admin/orders/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const order =
          await adminOrderController.getOrderById(
            params.id,
          );

        return reply.send({
          success: true,
          data: order,
        });
      } catch (error) {
        return handleAdminOrderError(
          reply,
          error,
        );
      }
    },
  );

  // PATCH /admin/orders/:id/status
  app.patch(
    "/admin/orders/:id/status",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = request.body as {
          status: OrderStatus;
        };

        const order =
          await adminOrderController.updateOrderStatus(
            params.id,
            body.status,
          );

        return reply.send({
          success: true,
          data: order,
        });
      } catch (error) {
        return handleAdminOrderError(
          reply,
          error,
        );
      }
    },
  );
}

function handleAdminOrderError(
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
    INVALID_ID: 400,

    ORDER_NOT_FOUND: 404,

    INVALID_ORDER_STATUS_TRANSITION: 400,

    ONLINE_PAYMENT_NOT_SUPPORTED: 400,

    INSUFFICIENT_AVAILABLE_STOCK: 409,
    INSUFFICIENT_RESERVED_STOCK: 409,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}

