import { FastifyInstance } from "fastify";
import { productController } from "../../controllers/product/product.controller.js";

export async function productRoutes(
  app: FastifyInstance,
) {
  // GET /products
  app.get(
    "/products",
    async (_request, reply) => {
      try {
        const products =
          await productController.getAllProducts();

        return reply.send({
          success: true,
          data: products,
        });
      } catch (error) {
        return handleProductError(reply, error);
      }
    },
  );

  // GET /products/:id
  app.get(
    "/products/:id",
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const product =
          await productController.getProductById(
            params.id,
          );

        return reply.send({
          success: true,
          data: product,
        });
      } catch (error) {
        return handleProductError(reply, error);
      }
    },
  );

  // GET /products/slug/:slug
  app.get(
    "/products/slug/:slug",
    async (request, reply) => {
      try {
        const params = request.params as {
          slug: string;
        };

        const product =
          await productController.getProductBySlug(
            params.slug,
          );

        return reply.send({
          success: true,
          data: product,
        });
      } catch (error) {
        return handleProductError(reply, error);
      }
    },
  );

  // GET /products/category/:categoryId
  app.get(
    "/products/category/:categoryId",
    async (request, reply) => {
      try {
        const params = request.params as {
          categoryId: string;
        };

        const products =
          await productController.getProductsByCategory(
            params.categoryId,
          );

        return reply.send({
          success: true,
          data: products,
        });
      } catch (error) {
        return handleProductError(reply, error);
      }
    },
  );
}

function handleProductError(
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
    PRODUCT_NOT_FOUND: 404,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}