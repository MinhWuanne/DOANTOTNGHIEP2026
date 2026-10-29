import { FastifyInstance } from "fastify";
import { adminCategoryController } from "../../../controllers/admin/category/admin-category.controller.js";
import { adminAuthMiddleware } from "../../../middlewares/admin/admin-auth.middleware.js";
import { adminOnlyMiddleware } from "../../../middlewares/admin/admin-only.middleware.js";

export async function adminCategoryRoutes(
  app: FastifyInstance,
) {
  const adminAuth = {
    preHandler: [
      adminAuthMiddleware,
      adminOnlyMiddleware,
    ],
  };


  app.get(
    "/admin/categories",
    adminAuth,
    async (request, reply) => {
      try {
        const query = request.query as {
          page?: string;
          limit?: string;
          search?: string;
        };

        const parsePositiveInteger = (
          value: string | undefined,
          fallback: number,
        ): number => {
          if (value === undefined) {
            return fallback;
          }

          if (!/^[1-9]\d*$/.test(value)) {
            throw new Error("INVALID_PAGINATION");
          }

          const parsed = Number(value);

          if (!Number.isSafeInteger(parsed)) {
            throw new Error("INVALID_PAGINATION");
          }

          return parsed;
        };

        const page = parsePositiveInteger(
          query.page,
          1,
        );

        const limit = parsePositiveInteger(
          query.limit,
          10,
        );

        if (![10, 20, 50].includes(limit)) {
          throw new Error("INVALID_PAGINATION");
        }

        const search =
          typeof query.search === "string"
            ? query.search.trim()
            : "";

        const result =
          await adminCategoryController.getCategories(
            page,
            limit,
            search,
          );

        return reply.send({
          success: true,
          data: result.data,
          pagination: result.pagination,
        });
      } catch (error) {
        return handleAdminCategoryError(
          reply,
          error,
        );
      }
    },
  );

  app.get(
    "/admin/categories/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const category =
          await adminCategoryController.getCategoryById(
            params.id,
          );

        return reply.send({
          success: true,
          data: category,
        });
      } catch (error) {
        return handleAdminCategoryError(
          reply,
          error,
        );
      }
    },
  );

  app.post(
    "/admin/categories",
    adminAuth,
    async (request, reply) => {
      try {
        const body = request.body as {
          name?: string;
          slug?: string;
          description?: string;
        };

        const category =
          await adminCategoryController.createCategory(
            body.name as string,
            body.slug as string,
            body.description,
          );

        return reply.code(201).send({
          success: true,
          data: category,
        });
      } catch (error) {
        return handleAdminCategoryError(
          reply,
          error,
        );
      }
    },
  );

  app.patch(
    "/admin/categories/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const body = request.body as {
          name?: string;
          slug?: string;
          description?: string;
        };

        const category =
          await adminCategoryController.updateCategory(
            params.id,
            body.name,
            body.slug,
            body.description,
          );

        return reply.send({
          success: true,
          data: category,
        });
      } catch (error) {
        return handleAdminCategoryError(
          reply,
          error,
        );
      }
    },
  );

  app.delete(
    "/admin/categories/:id",
    adminAuth,
    async (request, reply) => {
      try {
        const params = request.params as {
          id: string;
        };

        const result =
          await adminCategoryController.deleteCategory(
            params.id,
          );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        return handleAdminCategoryError(
          reply,
          error,
        );
      }
    },
  );
}

function handleAdminCategoryError(
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

    INVALID_CATEGORY_NAME: 400,
    INVALID_CATEGORY_SLUG: 400,
    INVALID_CATEGORY_DESCRIPTION: 400,

    NO_FIELDS_TO_UPDATE: 400,

    CATEGORY_ALREADY_EXISTS: 400,
    CATEGORY_NOT_FOUND: 404,
    CATEGORY_HAS_PRODUCTS: 400,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}