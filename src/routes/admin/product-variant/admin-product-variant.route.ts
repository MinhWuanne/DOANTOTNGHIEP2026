
import { FastifyInstance } from "fastify";

import { adminProductVariantController } from "../../../controllers/admin/product-variant/admin-product-variant.controller.js";

import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";

import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminProductVariantRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  // GET VARIANTS BY PRODUCT
  app.get(
    "/admin/products/:productId/variants",
    adminAuth,
    async (request, reply) => {
      return adminProductVariantController.getVariantsByProduct(
        request as any,
        reply,
      );
    },
  );

  // GET VARIANT DETAIL
  app.get(
    "/admin/product-variants/:id",
    adminAuth,
    async (request, reply) => {
      return adminProductVariantController.getVariantById(
        request as any,
        reply,
      );
    },
  );

  // CREATE VARIANT
  app.post(
    "/admin/product-variants",
    adminAuth,
    async (request, reply) => {
      return adminProductVariantController.createVariant(
        request as any,
        reply,
      );
    },
  );

  // UPDATE VARIANT
  app.patch(
    "/admin/product-variants/:id",
    adminAuth,
    async (request, reply) => {
      return adminProductVariantController.updateVariant(
        request as any,
        reply,
      );
    },
  );

  // UPDATE VARIANT STATUS
  app.patch(
    "/admin/product-variants/:id/status",
    adminAuth,
    async (request, reply) => {
      return adminProductVariantController.updateVariantStatus(
        request as any,
        reply,
      );
    },
  );
}

