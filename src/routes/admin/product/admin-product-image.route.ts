
import type { FastifyInstance } from "fastify";

import { adminProductImageController } from "../../../controllers/admin/product/admin-product-image.controller.js";

import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminProductImageRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };

  // GET PRODUCT IMAGES
  app.get(
    "/admin/products/:id/images",
    adminAuth,
    async (request, reply) => {
      return adminProductImageController.getImages(
        request as any,
        reply,
      );
    },
  );

  // UPLOAD PRODUCT IMAGE
  app.post(
    "/admin/products/:id/images",
    adminAuth,
    async (request, reply) => {
      return adminProductImageController.uploadImage(
        request as any,
        reply,
      );
    },
  );

  // SET PRIMARY PRODUCT IMAGE
  app.patch(
    "/admin/products/:id/images/:imageId/primary",
    adminAuth,
    async (request, reply) => {
      return adminProductImageController.setPrimaryImage(
        request as any,
        reply,
      );
    },
  );

  // DELETE PRODUCT IMAGE
  app.delete(
    "/admin/products/:id/images/:imageId",
    adminAuth,
    async (request, reply) => {
      return adminProductImageController.deleteImage(
        request as any,
        reply,
      );
    },
  );
}
