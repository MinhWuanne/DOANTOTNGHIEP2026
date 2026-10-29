
import { FastifyInstance } from "fastify";
import { categoryController } from "../../controllers/category/category.controller.js";

export async function categoryRoutes(
  app: FastifyInstance,
) {
  // GET /categories
  app.get(
    "/categories",
    async (_request, reply) => {
      try {
        const categories =
          await categoryController.getAllCategories();

        return reply.send({
          success: true,
          data: categories,
        });
      } catch (error) {
        return handleCategoryError(reply, error);
      }
    },
  );

  // GET /categories/:id
  app.get(
    "/categories/:id",
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const category =
          await categoryController.getCategoryById(
            params.id,
          );

        return reply.send({
          success: true,
          data: category,
        });
      } catch (error) {
        return handleCategoryError(reply, error);
      }
    },
  );

  // GET /categories/slug/:slug
  app.get(
    "/categories/slug/:slug",
    async (request, reply) => {
      try {
        const params = request.params as {
          slug: string;
        };

        const category =
          await categoryController.getCategoryBySlug(
            params.slug,
          );

        return reply.send({
          success: true,
          data: category,
        });
      } catch (error) {
        return handleCategoryError(reply, error);
      }
    },
  );

  // GET /categories/:id/products
  app.get(
    "/categories/:id/products",
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const category =
          await categoryController.getCategoryWithProducts(
            params.id,
          );

        return reply.send({
          success: true,
          data: category,
        });
      } catch (error) {
        return handleCategoryError(reply, error);
      }
    },
  );
}

function handleCategoryError(
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
    CATEGORY_NOT_FOUND: 404,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}

