import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";

function validateCategoryName(name: unknown): string {
  if (typeof name !== "string") {
    throw new Error("INVALID_CATEGORY_NAME");
  }

  const trimmed = name.trim();

  if (trimmed.length === 0) {
    throw new Error("INVALID_CATEGORY_NAME");
  }

  return trimmed;
}

function validateCategorySlug(slug: unknown): string {
  if (typeof slug !== "string") {
    throw new Error("INVALID_CATEGORY_SLUG");
  }

  const trimmed = slug.trim();

  if (trimmed.length === 0) {
    throw new Error("INVALID_CATEGORY_SLUG");
  }

  return trimmed;
}

function validateOptionalDescription(
  description: unknown,
): string | undefined {
  if (description === undefined) {
    return undefined;
  }

  if (typeof description !== "string") {
    throw new Error("INVALID_CATEGORY_DESCRIPTION");
  }

  return description;
}

function isPrismaUniqueConstraintError(
  error: unknown,
): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export class AdminCategoryService {

  async getCategories(
    page = 1,
    limit = 10,
    search = "",
  ) {
    const normalizedSearch = search.trim();

    const where = normalizedSearch
      ? {
        OR: [
          { name: { contains: normalizedSearch } },
          { slug: { contains: normalizedSearch } },
        ],
      }
      : {};

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.category.count({ where }),
    ]);

    return {
      data: categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCategoryById(id: bigint | number) {
    const category = await prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    return category;
  }

  async createCategory(
    name: string,
    slug: string,
    description?: string,
  ) {
    const validName = validateCategoryName(name);
    const validSlug = validateCategorySlug(slug);
    const validDescription =
      validateOptionalDescription(description);

    const existingCategory =
      await prisma.category.findFirst({
        where: {
          OR: [
            { name: validName },
            { slug: validSlug },
          ],
        },
      });

    if (existingCategory) {
      throw new Error("CATEGORY_ALREADY_EXISTS");
    }

    try {
      return await prisma.category.create({
        data: {
          name: validName,
          slug: validSlug,
          description: validDescription,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new Error("CATEGORY_ALREADY_EXISTS");
      }

      throw error;
    }
  }

  async updateCategory(
    id: bigint | number,
    name?: string,
    slug?: string,
    description?: string,
  ) {
    const category =
      await prisma.category.findUnique({
        where: { id },
      });

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    const hasName = name !== undefined;
    const hasSlug = slug !== undefined;
    const hasDescription =
      description !== undefined;

    if (
      !hasName &&
      !hasSlug &&
      !hasDescription
    ) {
      throw new Error("NO_FIELDS_TO_UPDATE");
    }

    const validName = hasName
      ? validateCategoryName(name)
      : undefined;

    const validSlug = hasSlug
      ? validateCategorySlug(slug)
      : undefined;

    const validDescription =
      validateOptionalDescription(description);

    if (hasName || hasSlug) {
      const duplicateConditions = [];

      if (hasName) {
        duplicateConditions.push({
          name: validName,
        });
      }

      if (hasSlug) {
        duplicateConditions.push({
          slug: validSlug,
        });
      }

      const existingCategory =
        await prisma.category.findFirst({
          where: {
            AND: [
              {
                id: {
                  not: id,
                },
              },
              {
                OR: duplicateConditions,
              },
            ],
          },
        });

      if (existingCategory) {
        throw new Error(
          "CATEGORY_ALREADY_EXISTS",
        );
      }
    }

    try {
      return await prisma.category.update({
        where: { id },
        data: {
          ...(hasName && {
            name: validName,
          }),
          ...(hasSlug && {
            slug: validSlug,
          }),
          ...(hasDescription && {
            description: validDescription,
          }),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new Error("CATEGORY_ALREADY_EXISTS");
      }

      throw error;
    }
  }

  async deleteCategory(id: bigint | number) {
    const category =
      await prisma.category.findUnique({
        where: { id },
      });

    if (!category) {
      throw new Error("CATEGORY_NOT_FOUND");
    }

    const productCount =
      await prisma.product.count({
        where: {
          categoryId: id,
        },
      });

    if (productCount > 0) {
      throw new Error(
        "CATEGORY_HAS_PRODUCTS",
      );
    }

    await prisma.category.delete({
      where: { id },
    });

    return {
      id,
      deleted: true,
    };
  }
}

export const adminCategoryService =
  new AdminCategoryService();