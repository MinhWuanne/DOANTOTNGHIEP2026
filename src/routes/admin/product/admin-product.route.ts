
import {
  FastifyInstance,
  FastifyRequest,
} from "fastify";

import { adminProductController } from "../../../controllers/admin/product/admin-product.controller.js";

import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";

import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

import type { ProductListQuery } from "../../../controllers/admin/product/admin-product.controller.js";

export async function adminProductRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  // GET ALL PRODUCTS
  app.get(
    "/admin/products",
    adminAuth,
    async (
      request: FastifyRequest<{
        Querystring: ProductListQuery;
      }>,
      reply,
    ) => {
      return adminProductController.getProducts(
        request,
        reply,
      );
    },
  );

  // GET PRODUCT DETAIL
  app.get(
    "/admin/products/:id",
    adminAuth,
    async (request, reply) => {
      return adminProductController.getProductById(
        request as any,
        reply,
      );
    },
  );

  // CREATE PRODUCT
  app.post(
    "/admin/products",
    adminAuth,
    async (request, reply) => {
      return adminProductController.createProduct(
        request as any,
        reply,
      );
    },
  );

  // UPDATE PRODUCT
  app.patch(
    "/admin/products/:id",
    adminAuth,
    async (request, reply) => {
      return adminProductController.updateProduct(
        request as any,
        reply,
      );
    },
  );
}

