
import { prisma } from "../../lib/prisma.js";
import { ProductStatus } from "../../generated/prisma/enums.js";

export class ProductService {
  async getAllProducts() {
    return prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
      },
      include: {
        category: true,
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        variants: {
          where: {
            status: ProductStatus.ACTIVE,
          },
          include: {
            inventory: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });
  }

  async getProductById(productId: bigint | number) {
    const id = BigInt(productId);

    const product = await prisma.product.findFirst({
      where: {
        id,
        status: ProductStatus.ACTIVE,
      },
      include: {
        category: true,
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        variants: {
          where: {
            status: ProductStatus.ACTIVE,
          },
          include: {
            inventory: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    return product;
  }

  async getProductBySlug(slug: string) {
    const product = await prisma.product.findFirst({
      where: {
        slug,
        status: ProductStatus.ACTIVE,
      },
      include: {
        category: true,
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        variants: {
          where: {
            status: ProductStatus.ACTIVE,
          },
          include: {
            inventory: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    return product;
  }

  async getProductsByCategory(categoryId: bigint | number) {
    const id = BigInt(categoryId);

    return prisma.product.findMany({
      where: {
        categoryId: id,
        status: ProductStatus.ACTIVE,
      },
      include: {
        category: true,
        images: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        variants: {
          where: {
            status: ProductStatus.ACTIVE,
          },
          include: {
            inventory: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });
  }
}

export const productService = new ProductService();
