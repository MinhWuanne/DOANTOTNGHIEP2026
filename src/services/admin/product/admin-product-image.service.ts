
import { prisma } from "../../../lib/prisma.js";

export class AdminProductImageService {
  async getImages(productId: bigint) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    return prisma.productImage.findMany({
      where: { productId },
      orderBy: [
        { sortOrder: "asc" },
        { id: "asc" },
      ],
    });
  }

  async createImage(
    productId: bigint,
    url: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true },
      });

      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const imageCount = await tx.productImage.count({
        where: { productId },
      });

      return tx.productImage.create({
        data: {
          productId,
          url,
          sortOrder: imageCount,
          isPrimary: imageCount === 0,
        },
      });
    });
  }

  async setPrimaryImage(
    productId: bigint,
    imageId: bigint,
  ) {
    return prisma.$transaction(async (tx) => {
      const image = await tx.productImage.findFirst({
        where: {
          id: imageId,
          productId,
        },
      });

      if (!image) {
        throw new Error("PRODUCT_IMAGE_NOT_FOUND");
      }

      await tx.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });

      return tx.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      });
    });
  }

  async deleteImage(
    productId: bigint,
    imageId: bigint,
  ) {
    return prisma.$transaction(async (tx) => {
      const image = await tx.productImage.findFirst({
        where: {
          id: imageId,
          productId,
        },
      });

      if (!image) {
        throw new Error("PRODUCT_IMAGE_NOT_FOUND");
      }

      await tx.productImage.delete({
        where: { id: imageId },
      });

      if (image.isPrimary) {
        const nextImage = await tx.productImage.findFirst({
          where: { productId },
          orderBy: [
            { sortOrder: "asc" },
            { id: "asc" },
          ],
        });

        if (nextImage) {
          await tx.productImage.update({
            where: { id: nextImage.id },
            data: { isPrimary: true },
          });
        }
      }

      return { success: true };
    });
  }
}

export const adminProductImageService =
  new AdminProductImageService();
