import { FastifyInstance } from "fastify";
import { cartController } from "../../controllers/cart/cart.controller.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { accountOwnershipMiddleware } from "../../middlewares/auth/account-ownership.middleware.js";

export async function cartRoutes(app: FastifyInstance) {
  // GET /carts/:accountId
  app.get(
    "/carts/:accountId",
    {
      preHandler: [
        authMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        const cart = await cartController.getCart(
          params.accountId,
        );

        return reply.send({
          success: true,
          data: cart,
        });
      } catch (error) {
        return handleCartError(reply, error);
      }
    },
  );

  // POST /carts/:accountId/items
  app.post(
    "/carts/:accountId/items",
    {
      preHandler: [
        authMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        const body = request.body as {
          variantId: string | number;
          quantity: number;
        };

        const item = await cartController.addItem(
          params.accountId,
          {
            variantId: body.variantId,
            quantity: body.quantity,
          },
        );

        return reply.code(201).send({
          success: true,
          data: item,
        });
      } catch (error) {
        return handleCartError(reply, error);
      }
    },
  );

  // PATCH /carts/:accountId/items/:variantId
  app.patch(
    "/carts/:accountId/items/:variantId",
    {
      preHandler: [
        authMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
          variantId: string;
        };

        const body = request.body as {
          quantity: number;
        };

        const item = await cartController.updateItem(
          params.accountId,
          {
            variantId: params.variantId,
            quantity: body.quantity,
          },
        );

        return reply.send({
          success: true,
          data: item,
        });
      } catch (error) {
        return handleCartError(reply, error);
      }
    },
  );

  // DELETE /carts/:accountId/items/:variantId
  app.delete(
    "/carts/:accountId/items/:variantId",
    {
      preHandler: [
        authMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
          variantId: string;
        };

        const result = await cartController.removeItem(
          params.accountId,
          params.variantId,
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleCartError(reply, error);
      }
    },
  );

  // DELETE /carts/:accountId/items
  app.delete(
    "/carts/:accountId/items",
    {
      preHandler: [
        authMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        const result = await cartController.clearCart(
          params.accountId,
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleCartError(reply, error);
      }
    },
  );
}

function handleCartError(
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
    ACCOUNT_NOT_FOUND: 404,
    CART_NOT_FOUND: 404,
    CART_ITEM_NOT_FOUND: 404,
    PRODUCT_VARIANT_NOT_FOUND: 404,

    INVALID_CART_ITEM_QUANTITY: 400,
    PRODUCT_VARIANT_NOT_ACTIVE: 400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}