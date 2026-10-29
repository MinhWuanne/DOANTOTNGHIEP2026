import { prisma } from "../../../lib/prisma.js";
import { ProductStatus } from "../../../generated/prisma/enums.js";

interface GetProductsInput {
  page: number;
  limit: number;
  search: string;
  status?: ProductStatus;
}

export class AdminProductService {
  async getProducts(input: GetProductsInput) {
    const {
      page,
      limit,
      search,
      status,
    } = input;

    const skip = (page - 1) * limit;

    const where = {
      ...(search
        ? {
          OR: [
            {
              name: {
                contains: search,
              },
            },
            {
              slug: {
                contains: search,
              },
            },
            {
              category: {
                name: {
                  contains: search,
                },
              },
            },
          ],
        }
        : {}),
      ...(status !== undefined
        ? {
          status,
        }
        : {}),
    };

    const [
      products,
      total,
      active,
      inactive,
    ] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
        select: {
          id: true,
          categoryId: true,
          name: true,
          slug: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          category: true,
        },
      }),

      prisma.product.count({
        where,
      }),

      prisma.product.count({
        where: {
          status: ProductStatus.ACTIVE,
        },
      }),

      prisma.product.count({
        where: {
          status: ProductStatus.INACTIVE,
        },
      }),
    ]);

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / limit);

    return {
      data: products,

      pagination: {
        page,
        limit,
        total,
        totalPages,
      },

      summary: {
        total,
        active,
        inactive,
      },
    };
  }

  async getProductById(id: bigint | number) {
    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        categoryId: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: true,
      },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    return product;
  }

  async createProduct(
    categoryId: bigint | number,
    name: string,
    slug: string,
    description?: string,
  ) {
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error("INVALID_PRODUCT_NAME");
    }

    if (typeof slug !== "string" || slug.trim() === "") {
      throw new Error("INVALID_PRODUCT_SLUG");
    }

    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      throw new Error("INVALID_PRODUCT_DESCRIPTION");
    }

    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    const existingProduct = await prisma.product.findFirst({
      where: {
        slug,
      },
    });

    if (existingProduct) {
      throw new Error("PRODUCT_ALREADY_EXISTS");
    }

    return prisma.product.create({
      data: {
        categoryId,
        name,
        slug,
        description,
        status: ProductStatus.ACTIVE,
      },
      select: {
        id: true,
        categoryId: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: true,
      },
    });
  }

  async updateProduct(
    id: bigint | number,
    categoryId?: bigint | number,
    name?: string,
    slug?: string,
    description?: string,
    status?: ProductStatus,
  ) {
    const product = await prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!product) {
      throw new Error("PRODUCT_NOT_FOUND");
    }

    const hasUpdate =
      categoryId !== undefined ||
      name !== undefined ||
      slug !== undefined ||
      description !== undefined ||
      status !== undefined;

    if (!hasUpdate) {
      throw new Error("NO_FIELDS_TO_UPDATE");
    }

    if (categoryId !== undefined) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new Error("CATEGORY_NOT_FOUND");
      }
    }

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        name.trim() === ""
      ) {
        throw new Error("INVALID_PRODUCT_NAME");
      }
    }

    if (
      description !== undefined &&
      typeof description !== "string"
    ) {
      throw new Error("INVALID_PRODUCT_DESCRIPTION");
    }

    if (slug !== undefined) {
      if (
        typeof slug !== "string" ||
        slug.trim() === ""
      ) {
        throw new Error("INVALID_PRODUCT_SLUG");
      }

      const existingProduct =
        await prisma.product.findFirst({
          where: {
            AND: [
              {
                id: {
                  not: id,
                },
              },
              {
                slug,
              },
            ],
          },
        });

      if (existingProduct) {
        throw new Error("PRODUCT_ALREADY_EXISTS");
      }
    }

    if (status !== undefined) {
      if (!Object.values(ProductStatus).includes(status)) {
        throw new Error("INVALID_PRODUCT_STATUS");
      }
    }

    return prisma.product.update({
      where: {
        id,
      },
      data: {
        ...(categoryId !== undefined && { categoryId }),
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
      },
      select: {
        id: true,
        categoryId: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        category: true,
      },
    });
  }
}

export const adminProductService =
  new AdminProductService();