import { adminCategoryService } from "../../../services/admin/category/admin-category.service.js";

function parseCategoryId(
  value: string,
): bigint {
  if (
    typeof value !== "string" ||
    !/^[1-9]\d*$/.test(value)
  ) {
    throw new Error("INVALID_ID");
  }

  try {
    return BigInt(value);
  } catch {
    throw new Error("INVALID_ID");
  }
}

export class AdminCategoryController {

  async getCategories(
    page = 1,
    limit = 10,
    search = "",
  ) {
    return adminCategoryService.getCategories(
      page,
      limit,
      search,
    );
  }

  async getCategoryById(id: string) {
    return adminCategoryService.getCategoryById(
      parseCategoryId(id),
    );
  }

  async createCategory(
    name: string,
    slug: string,
    description?: string,
  ) {
    return adminCategoryService.createCategory(
      name,
      slug,
      description,
    );
  }

  async updateCategory(
    id: string,
    name?: string,
    slug?: string,
    description?: string,
  ) {
    return adminCategoryService.updateCategory(
      parseCategoryId(id),
      name,
      slug,
      description,
    );
  }

  async deleteCategory(id: string) {
    return adminCategoryService.deleteCategory(
      parseCategoryId(id),
    );
  }
}

export const adminCategoryController =
  new AdminCategoryController();