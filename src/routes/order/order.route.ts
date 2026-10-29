import { FastifyInstance } from "fastify";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { orderAccountOwnershipMiddleware } from "../../middlewares/auth/order-account-ownership.middleware.js";
import { orderAccessOwnershipMiddleware } from "../../middlewares/auth/order-access-ownership.middleware.js";

import {
  AccountPlatform,
  PaymentMethod,
} from "../../generated/prisma/enums.js";

import {
  orderController,
} from "../../controllers/order/order.controller.js";

export async function orderRoutes(
  app: FastifyInstance,
) {
  // POST /orders
  app.post(
    "/orders",
    {
      preHandler: [
        authMiddleware,
        orderAccountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const body =
          request.body as {
            accountId: string | number;

            addressId:
              | string
              | number;

            platform:
              | "MEMBER"
              | "FRANCHISE";

            paymentMethod:
              PaymentMethod;

            shippingFee?:
              | string
              | number;

            discount?:
              | string
              | number;

            items: Array<{
              variantId:
                | string
                | number;

              quantity: number;
            }>;
          };

        const order =
          await orderController.createOrder(
            body,
          );

        return reply
          .code(201)
          .send({
            success: true,
            data: order,
          });
      } catch (error) {
        return handleOrderError(
          reply,
          error,
        );
      }
    },
  );

  
  // GET /orders/my
  app.get(
    "/orders/my",
    {
      preHandler: [authMiddleware],
    },
    async (request, reply) => {
      try {
        if (
          request.auth.platform !==
          AccountPlatform.MEMBER
        ) {
          return reply.code(403).send({
            success: false,
            error: "MEMBER_ACCOUNT_REQUIRED",
          });
        }

        const orders =
          await orderController.getMyOrders(
            request.auth.accountId,
          );

        return reply.send({
          success: true,
          data: orders,
        });
      } catch (error) {
        return handleOrderError(
          reply,
          error,
        );
      }
    },
  );


  // GET /orders/:id
  app.get(
    "/orders/:id",
    {
      preHandler: [
        authMiddleware,
        orderAccessOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params =
          request.params as {
            id: string;
          };

        const order =
          await orderController.getOrderById(
            params.id,
          );

        if (!order) {
          return reply
            .code(404)
            .send({
              success: false,
              error:
                "ORDER_NOT_FOUND",
            });
        }

        return reply.send({
          success: true,
          data: order,
        });
      } catch (error) {
        return handleOrderError(
          reply,
          error,
        );
      }
    },
  );

}

function handleOrderError(
  reply: any,
  error: unknown,
) {
  if (!(error instanceof Error)) {
    return reply.code(500).send({
      success: false,
      error:
        "INTERNAL_SERVER_ERROR",
    });
  }

  const statusMap:
    Record<string, number> = {
    INVALID_PAYMENT_METHOD: 400,
    INVALID_ORDER_ITEMS: 400,
    INVALID_ORDER_ITEM: 400,
    INVALID_ID: 400,
    ORDER_NOT_FOUND: 404,
    ACCOUNT_NOT_FOUND: 404,
    ADDRESS_NOT_FOUND: 404,
    PRODUCT_VARIANT_NOT_FOUND: 404,
    PRODUCT_NOT_FOUND: 404,

    ADDRESS_REQUIRED: 400,

    ACCOUNT_PLATFORM_MISMATCH:
      400,

    ADDRESS_NOT_BELONG_TO_ACCOUNT_PERSON:
      400,

    PRODUCT_NOT_ACTIVE: 400,

    PRODUCT_VARIANT_NOT_ACTIVE:
      400,

    ORDER_ITEMS_REQUIRED: 400,

    INVALID_ITEM_QUANTITY: 400,

    DUPLICATE_VARIANT_IN_ORDER:
      400,

    INVALID_SHIPPING_FEE: 400,

    DISCOUNT_EXCEEDS_SUBTOTAL:
      400,

    INVALID_ORDER_STATUS_TRANSITION:
      400,

    ONLINE_PAYMENT_NOT_SUPPORTED:
      400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply
    .code(statusCode)
    .send({
      success: false,
      error: error.message,
    });
}