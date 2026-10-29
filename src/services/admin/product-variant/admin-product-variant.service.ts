
import { prisma } from "../../../lib/prisma.js";
import { ProductStatus } from "../../../generated/prisma/enums.js";

export class AdminProductVariantService {
  async getVariantsByProduct(productId: bigint | number) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    return prisma.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        productId: true,
        sku: true,
        name: true,
        price: true,
        compareAtPrice: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        product: true,
        inventory: true,
      },
    });
  }

  async getVariantById(id: bigint | number) {
    const variant = await prisma.productVariant.findUnique({
      where: { id },
      select: {
        id: true,
        productId: true,
        sku: true,
        name: true,
        price: true,
        compareAtPrice: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        product: true,
        inventory: true,
      },
    });

    if (!variant) {
      throw new Error("VARIANT_NOT_FOUND");
    }

    return variant;
  }

  async createVariant(
    productId: bigint | number,
    sku: string,
    name: string,
    price: number,
    compareAtPrice?: number | null,
  ) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    // V2: SKU bắt buộc phải có nội dung
    if (
      typeof sku !== "string" ||
      sku.trim() === ""
    ) {
      throw new Error("INVALID_VARIANT_SKU");
    }

    // V3: Variant name bắt buộc phải có nội dung
    if (
      typeof name !== "string" ||
      name.trim() === ""
    ) {
      throw new Error("INVALID_VARIANT_NAME");
    }
        
    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      throw new Error("INVALID_PRICE");
    }

    if (
      compareAtPrice !== undefined &&
      compareAtPrice !== null
    ) {
      if (
        typeof compareAtPrice !== "number" ||
        !Number.isFinite(compareAtPrice) ||
        compareAtPrice < 0
      ) {
        throw new Error("INVALID_COMPARE_AT_PRICE");
      }
    }

    if (
      compareAtPrice !== undefined &&
      compareAtPrice !== null &&
      compareAtPrice < price
    ) {
      throw new Error(
        "COMPARE_AT_PRICE_MUST_BE_GREATER_OR_EQUAL_TO_PRICE",
      );
    }

    const existingVariant =
      await prisma.productVariant.findUnique({
        where: { sku },
      });

    if (existingVariant) {
      throw new Error("VARIANT_ALREADY_EXISTS");
    }

    return prisma.productVariant.create({
      data: {
        productId,
        sku,
        name,
        price,
        compareAtPrice,
        status: ProductStatus.ACTIVE,
      },
      select: {
        id: true,
        productId: true,
        sku: true,
        name: true,
        price: true,
        compareAtPrice: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        product: true,
        inventory: true,
      },
    });
  }

  async updateVariant(
    id: bigint | number,
    productId?: bigint | number,
    sku?: string,
    name?: string,
    price?: number,
    compareAtPrice?: number | null,
    status?: ProductStatus,
  ) {
    const variant = await prisma.productVariant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw new Error("VARIANT_NOT_FOUND");
    }

    // V1: PATCH {} không được phép
    const hasUpdate =
      productId !== undefined ||
      sku !== undefined ||
      name !== undefined ||
      price !== undefined ||
      compareAtPrice !== undefined ||
      status !== undefined;

    if (!hasUpdate) {
      throw new Error("NO_FIELDS_TO_UPDATE");
    }

    if (
      productId !== undefined &&
      productId !== variant.productId
    ) {
      throw new Error("PRODUCT_ID_CANNOT_BE_CHANGED");
    }

    // V2: SKU nếu được truyền vào thì không được rỗng
    if (sku !== undefined) {
      if (
        typeof sku !== "string" ||
        sku.trim() === ""
      ) {
        throw new Error("INVALID_VARIANT_SKU");
      }
    }

    // V3: name nếu được truyền vào thì không được rỗng
    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim() === ""
      ) {
        throw new Error("INVALID_VARIANT_NAME");
      }
    }

    if (price !== undefined) {
      if (
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price <= 0
      ) {
        throw new Error("INVALID_PRICE");
      }
    }

    if (
      compareAtPrice !== undefined &&
      compareAtPrice !== null
    ) {
      if (
        typeof compareAtPrice !== "number" ||
        !Number.isFinite(compareAtPrice) ||
        compareAtPrice < 0
      ) {
        throw new Error("INVALID_COMPARE_AT_PRICE");
      }
    }

    const finalPrice =
      price !== undefined
        ? price
        : Number(variant.price);

    const finalCompareAtPrice =
      compareAtPrice !== undefined
        ? compareAtPrice
        : variant.compareAtPrice !== null
          ? Number(variant.compareAtPrice)
          : null;

    if (
      finalCompareAtPrice !== null &&
      finalCompareAtPrice < finalPrice
    ) {
      throw new Error(
        "COMPARE_AT_PRICE_MUST_BE_GREATER_OR_EQUAL_TO_PRICE",
      );
    }

    if (sku !== undefined) {
      const existingVariant =
        await prisma.productVariant.findFirst({
          where: {
            AND: [
              {
                id: {
                  not: id,
                },
              },
              {
                sku,
              },
            ],
          },
        });

      if (existingVariant) {
        throw new Error("VARIANT_ALREADY_EXISTS");
      }
    }

    if (status !== undefined) {
      if (!Object.values(ProductStatus).includes(status)) {
        throw new Error("INVALID_PRODUCT_STATUS");
      }
    }

    return prisma.productVariant.update({
      where: { id },
      data: {
        ...(sku !== undefined && { sku }),
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price }),
        ...(compareAtPrice !== undefined && {
          compareAtPrice,
        }),
        ...(status !== undefined && { status }),
      },
      select: {
        id: true,
        productId: true,
        sku: true,
        name: true,
        price: true,
        compareAtPrice: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        product: true,
        inventory: true,
      },
    });
  }

  async updateVariantStatus(
    id: bigint | number,
    status: ProductStatus,
  ) {
    const variant = await prisma.productVariant.findUnique({
      where: { id },
    });

    if (!variant) {
      throw new Error("VARIANT_NOT_FOUND");
    }

    if (!Object.values(ProductStatus).includes(status)) {
      throw new Error("INVALID_PRODUCT_STATUS");
    }

    return prisma.productVariant.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        productId: true,
        sku: true,
        name: true,
        price: true,
        compareAtPrice: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        product: true,
        inventory: true,
      },
    });
  }
}

export const adminProductVariantService =
  new AdminProductVariantService();

