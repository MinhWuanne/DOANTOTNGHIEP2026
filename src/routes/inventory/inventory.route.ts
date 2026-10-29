import { FastifyInstance } from "fastify";

import {
  inventoryController,
} from "../../controllers/inventory/inventory.controller.js";

import { adminAuthMiddleware } from "../../middlewares/admin/admin-auth.middleware.js";

import { adminOnlyMiddleware } from "../../middlewares/admin/admin-only.middleware.js";

export async function inventoryRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  // =====================================================
  // GET /inventories
  // GET /inventories?productId=10
  // =====================================================

  app.get(
    "/inventories",
    adminAuth,
    async (request, reply) => {
      try {
        const query =
          request.query as {
            productId?: string;
          };

        const inventories =
          await inventoryController.getInventories(
            query.productId,
          );

        return reply.send({
          success: true,
          data: inventories,
        });
      } catch (error) {
        return handleInventoryError(
          reply,
          error,
        );
      }
    },
  );

  // =====================================================
  // GET /inventories/:variantId
  // =====================================================

  app.get(
    "/inventories/:variantId",
    adminAuth,
    async (request, reply) => {
      try {
        const params =
          request.params as {
            variantId: string;
          };

        const inventory =
          await inventoryController.getInventoryByVariantId(
            params.variantId,
          );

        if (!inventory) {
          return reply.code(404).send({
            success: false,
            error: "INVENTORY_NOT_FOUND",
          });
        }

        return reply.send({
          success: true,
          data: inventory,
        });
      } catch (error) {
        return handleInventoryError(
          reply,
          error,
        );
      }
    },
  );

  // =====================================================
  // POST /inventories
  // =====================================================

  app.post(
    "/inventories",
    adminAuth,
    async (request, reply) => {
      try {
        const body =
          request.body as {
            variantId: string | number;
            quantity?: number;
          };

        const inventory =
          await inventoryController.createInventory(
            body,
          );

        return reply.code(201).send({
          success: true,
          data: inventory,
        });
      } catch (error) {
        return handleInventoryError(
          reply,
          error,
        );
      }
    },
  );
}

function handleInventoryError(
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
    INVENTORY_NOT_FOUND: 404,
    PRODUCT_VARIANT_NOT_FOUND: 404,
    INVENTORY_ALREADY_EXISTS: 409,
    INVALID_ID: 400,

    INVALID_INVENTORY_QUANTITY: 400,
    INSUFFICIENT_STOCK: 400,
    INSUFFICIENT_AVAILABLE_STOCK: 400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}