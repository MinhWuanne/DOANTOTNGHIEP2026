import { productService } from "../../services/product/product.service.js";
import { parsePositiveId } from "../../utils/parse-positive-id.js";

export class ProductController {
  async getAllProducts() {
    return productService.getAllProducts();
  }

  async getProductById(productId: string | number) {
    return productService.getProductById(
      parsePositiveId(productId.toString()),
    );
  }

  async getProductBySlug(slug: string) {
    return productService.getProductBySlug(slug);
  }

  async getProductsByCategory(
    categoryId: string | number,
  ) {
    return productService.getProductsByCategory(
      parsePositiveId(categoryId.toString()),
    );
  }
}

export const productController =
  new ProductController();