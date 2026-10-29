import { FastifyReply, FastifyRequest } from "fastify";
import { adminProductService } from "../../../services/admin/product/admin-product.service.js";
import { ProductStatus } from "../../../generated/prisma/enums.js";
import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";
export interface ProductListQuery {
  page?: string;
  limit?: string;
  search?: string;
  status?: string;
}

export class AdminProductController {
  async getProducts(
    request: FastifyRequest<{
      Querystring: ProductListQuery;
    }>,
    reply: FastifyReply,
  ) {
    try {
      const page =
        request.query.page !== undefined
          ? Number(request.query.page)
          : 1;

      const limit =
        request.query.limit !== undefined
          ? Number(request.query.limit)
          : 10;

      const search =
        typeof request.query.search === "string"
          ? request.query.search.trim()
          : "";

      const status =
        request.query.status !== undefined &&
        request.query.status !== ""
          ? request.query.status
          : "ALL";

      if (
        !Number.isInteger(page) ||
        page < 1
      ) {
        return reply.status(400).send({
          success: false,
          error: "INVALID_PAGE",
        });
      }

      if (
        !Number.isInteger(limit) ||
        ![10, 20, 50].includes(limit)
      ) {
        return reply.status(400).send({
          success: false,
          error: "INVALID_LIMIT",
        });
      }

      if (
        status !== "ALL" &&
        !Object.values(ProductStatus).includes(
          status as ProductStatus,
        )
      ) {
        return reply.status(400).send({
          success: false,
          error: "INVALID_PRODUCT_STATUS",
        });
      }

      const result =
        await adminProductService.getProducts({
          page,
          limit,
          search,
          status:
            status === "ALL"
              ? undefined
              : (status as ProductStatus),
        });

      return reply.send({
        success: true,
        data: result.data,
        pagination: result.pagination,
        summary: result.summary,
      });
    } catch (error) {
      throw error;
    }
  }

  async getProductById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    try {
      const id = parseAdminId(request.params.id);

      const product =
        await adminProductService.getProductById(id);

      return reply.send({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_ID") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_ID",
          });
        }

        if (error.message === "PRODUCT_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "PRODUCT_NOT_FOUND",
          });
        }
      }

      throw error;
    }
  }

  async createProduct(
    request: FastifyRequest<{
      Body: {
        categoryId: string;
        name: string;
        slug: string;
        description?: string;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const {
        categoryId,
        name,
        slug,
        description,
      } = request.body;

      const product =
        await adminProductService.createProduct(
          parseAdminId(categoryId),
          name,
          slug,
          description,
        );

      return reply.status(201).send({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_ID") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_ID",
          });
        }

        if (error.message === "INVALID_PRODUCT_NAME") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRODUCT_NAME",
          });
        }

        if (error.message === "INVALID_PRODUCT_SLUG") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRODUCT_SLUG",
          });
        }

        if (
          error.message === "INVALID_PRODUCT_DESCRIPTION"
        ) {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRODUCT_DESCRIPTION",
          });
        }

        if (error.message === "INVALID_PRODUCT_STATUS") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRODUCT_STATUS",
          });
        }

        if (error.message === "CATEGORY_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "CATEGORY_NOT_FOUND",
          });
        }

        if (error.message === "PRODUCT_ALREADY_EXISTS") {
          return reply.status(409).send({
            success: false,
            error: "PRODUCT_ALREADY_EXISTS",
          });
        }
      }

      throw error;
    }
  }

  async updateProduct(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        categoryId?: string;
        name?: string;
        slug?: string;
        description?: string;
        status?: ProductStatus;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const id = parseAdminId(request.params.id);

      const {
        categoryId,
        name,
        slug,
        description,
        status,
      } = request.body;

      const product =
        await adminProductService.updateProduct(
          id,
          categoryId !== undefined
            ? parseAdminId(categoryId)
            : undefined,
          name,
          slug,
          description,
          status,
        );

      return reply.send({
        success: true,
        data: product,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_ID") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_ID",
          });
        }

        if (error.message === "PRODUCT_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "PRODUCT_NOT_FOUND",
          });
        }

        if (error.message === "INVALID_PRODUCT_NAME") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRODUCT_NAME",
          });
        }

        if (error.message === "INVALID_PRODUCT_SLUG") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRODUCT_SLUG",
          });
        }

        if (
          error.message === "INVALID_PRODUCT_DESCRIPTION"
        ) {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRODUCT_DESCRIPTION",
          });
        }

        if (error.message === "INVALID_PRODUCT_STATUS") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRODUCT_STATUS",
          });
        }

        if (error.message === "NO_FIELDS_TO_UPDATE") {
          return reply.status(400).send({
            success: false,
            error: "NO_FIELDS_TO_UPDATE",
          });
        }

        if (
          error.message === "CATEGORY_ID_CANNOT_BE_CHANGED"
        ) {
          return reply.status(400).send({
            success: false,
            error: "CATEGORY_ID_CANNOT_BE_CHANGED",
          });
        }

        if (error.message === "CATEGORY_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "CATEGORY_NOT_FOUND",
          });
        }

        if (error.message === "PRODUCT_ALREADY_EXISTS") {
          return reply.status(409).send({
            success: false,
            error: "PRODUCT_ALREADY_EXISTS",
          });
        }
      }

      throw error;
    }
  }
}

export const adminProductController =
  new AdminProductController();