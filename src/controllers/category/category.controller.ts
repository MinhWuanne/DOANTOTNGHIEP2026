
import { categoryService } from "../../services/category/category.service.js";
import { parsePositiveId } from "../../utils/parse-positive-id.js";

export class CategoryController {
  async getAllCategories() {
    return categoryService.getAllCategories();
  }

  async getCategoryById(
    categoryId: string | number,
  ) {
    return categoryService.getCategoryById(
      parsePositiveId(categoryId.toString()),
    );
  }

  async getCategoryBySlug(
    slug: string,
  ) {
    return categoryService.getCategoryBySlug(
      slug,
    );
  }

  async getCategoryWithProducts(
    categoryId: string | number,
  ) {
    return categoryService.getCategoryWithProducts(
      parsePositiveId(categoryId.toString()),
    );
  }
}

export const categoryController =
  new CategoryController();
