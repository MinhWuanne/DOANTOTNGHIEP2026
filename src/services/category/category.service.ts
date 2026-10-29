import { prisma } from "../../lib/prisma.js";
import { ProductStatus } from "../../generated/prisma/enums.js";

export class CategoryService {
  async getAllCategories() {
    return prisma.category.findMany({
      orderBy: {
        id: "asc",
      },
    });
  }

  async getCategoryById(
    categoryId: bigint | number,
  ) {
    const id = BigInt(categoryId);

    const category =
      await prisma.category.findUnique({
        where: {
          id,
        },
      });

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    return category;
  }

  async getCategoryBySlug(
    slug: string,
  ) {
    const category =
      await prisma.category.findUnique({
        where: {
          slug,
        },
      });

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    return category;
  }

  async getCategoryWithProducts(
    categoryId: bigint | number,
  ) {
    const id = BigInt(categoryId);

    const category =
      await prisma.category.findUnique({
        where: {
          id,
        },
        include: {
          products: {
            where: {
              status: ProductStatus.ACTIVE,
            },
            include: {
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
          },
        },
      });

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    return category;
  }
}

export const categoryService =
  new CategoryService();