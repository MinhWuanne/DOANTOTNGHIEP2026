import { FastifyReply, FastifyRequest } from "fastify";
import { adminProductVariantService } from "../../../services/admin/product-variant/admin-product-variant.service.js";
import { ProductStatus } from "../../../generated/prisma/enums.js";
import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";

export class AdminProductVariantController {
  async getVariantsByProduct(
    request: FastifyRequest<{
      Params: { productId: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const productId = parseAdminId(
        request.params.productId,
      );

      const variants =
        await adminProductVariantService.getVariantsByProduct(
          productId,
        );

      return reply.send({
        success: true,
        data: variants,
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

  async getVariantById(
    request: FastifyRequest<{
      Params: { id: string };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const id = parseAdminId(
        request.params.id,
      );

      const variant =
        await adminProductVariantService.getVariantById(
          id,
        );

      return reply.send({
        success: true,
        data: variant,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_ID") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_ID",
          });
        }

        if (error.message === "VARIANT_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "VARIANT_NOT_FOUND",
          });
        }
      }

      throw error;
    }
  }

  async createVariant(
    request: FastifyRequest<{
      Body: {
        productId: string;
        sku: string;
        name: string;
        price: number;
        compareAtPrice?: number | null;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const {
        productId,
        sku,
        name,
        price,
        compareAtPrice,
      } = request.body;

      const variant =
        await adminProductVariantService.createVariant(
          parseAdminId(productId),
          sku,
          name,
          price,
          compareAtPrice,
        );

      return reply.status(201).send({
        success: true,
        data: variant,
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

        if (
          error.message === "INVALID_VARIANT_SKU"
        ) {
          return reply.status(400).send({
            success: false,
            error: "INVALID_VARIANT_SKU",
          });
        }

        if (
          error.message === "INVALID_VARIANT_NAME"
        ) {
          return reply.status(400).send({
            success: false,
            error: "INVALID_VARIANT_NAME",
          });
        }

        if (
          error.message === "VARIANT_ALREADY_EXISTS"
        ) {
          return reply.status(409).send({
            success: false,
            error: "VARIANT_ALREADY_EXISTS",
          });
        }

        if (error.message === "INVALID_PRICE") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRICE",
          });
        }

        if (
          error.message ===
          "INVALID_COMPARE_AT_PRICE"
        ) {
          return reply.status(400).send({
            success: false,
            error: "INVALID_COMPARE_AT_PRICE",
          });
        }

        if (
          error.message ===
          "COMPARE_AT_PRICE_MUST_BE_GREATER_OR_EQUAL_TO_PRICE"
        ) {
          return reply.status(400).send({
            success: false,
            error:
              "COMPARE_AT_PRICE_MUST_BE_GREATER_OR_EQUAL_TO_PRICE",
          });
        }
      }

      throw error;
    }
  }

  async updateVariant(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        productId?: string;
        sku?: string;
        name?: string;
        price?: number;
        compareAtPrice?: number | null;
        status?: ProductStatus;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const id = parseAdminId(
        request.params.id,
      );

      const {
        productId,
        sku,
        name,
        price,
        compareAtPrice,
        status,
      } = request.body;

      const variant =
        await adminProductVariantService.updateVariant(
          id,
          productId !== undefined
            ? parseAdminId(productId)
            : undefined,
          sku,
          name,
          price,
          compareAtPrice,
          status,
        );

      return reply.send({
        success: true,
        data: variant,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_ID") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_ID",
          });
        }

        if (error.message === "VARIANT_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "VARIANT_NOT_FOUND",
          });
        }

        if (
          error.message === "NO_FIELDS_TO_UPDATE"
        ) {
          return reply.status(400).send({
            success: false,
            error: "NO_FIELDS_TO_UPDATE",
          });
        }

        if (
          error.message ===
          "PRODUCT_ID_CANNOT_BE_CHANGED"
        ) {
          return reply.status(400).send({
            success: false,
            error: "PRODUCT_ID_CANNOT_BE_CHANGED",
          });
        }

        if (error.message === "PRODUCT_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "PRODUCT_NOT_FOUND",
          });
        }

        if (
          error.message === "INVALID_VARIANT_SKU"
        ) {
          return reply.status(400).send({
            success: false,
            error: "INVALID_VARIANT_SKU",
          });
        }

        if (
          error.message === "INVALID_VARIANT_NAME"
        ) {
          return reply.status(400).send({
            success: false,
            error: "INVALID_VARIANT_NAME",
          });
        }

        if (
          error.message === "VARIANT_ALREADY_EXISTS"
        ) {
          return reply.status(409).send({
            success: false,
            error: "VARIANT_ALREADY_EXISTS",
          });
        }

        if (error.message === "INVALID_PRICE") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRICE",
          });
        }

        if (
          error.message ===
          "INVALID_COMPARE_AT_PRICE"
        ) {
          return reply.status(400).send({
            success: false,
            error: "INVALID_COMPARE_AT_PRICE",
          });
        }

        if (
          error.message ===
          "COMPARE_AT_PRICE_MUST_BE_GREATER_OR_EQUAL_TO_PRICE"
        ) {
          return reply.status(400).send({
            success: false,
            error:
              "COMPARE_AT_PRICE_MUST_BE_GREATER_OR_EQUAL_TO_PRICE",
          });
        }

        if (
          error.message ===
          "INVALID_PRODUCT_STATUS"
        ) {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRODUCT_STATUS",
          });
        }
      }

      throw error;
    }
  }

  async updateVariantStatus(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        status: ProductStatus;
      };
    }>,
    reply: FastifyReply,
  ) {
    try {
      const id = parseAdminId(
        request.params.id,
      );

      const { status } = request.body;

      const variant =
        await adminProductVariantService.updateVariantStatus(
          id,
          status,
        );

      return reply.send({
        success: true,
        data: variant,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "INVALID_ID") {
          return reply.status(400).send({
            success: false,
            error: "INVALID_ID",
          });
        }

        if (error.message === "VARIANT_NOT_FOUND") {
          return reply.status(404).send({
            success: false,
            error: "VARIANT_NOT_FOUND",
          });
        }

        if (
          error.message ===
          "INVALID_PRODUCT_STATUS"
        ) {
          return reply.status(400).send({
            success: false,
            error: "INVALID_PRODUCT_STATUS",
          });
        }
      }

      throw error;
    }
  }
}

export const adminProductVariantController =
  new AdminProductVariantController();