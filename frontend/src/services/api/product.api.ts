import { API_BASE_URL } from "./api-config";

export interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductInventory {
  quantity: number;
  reservedQty: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string | null;
  price: string;
  compareAtPrice: string | null;
  inventory: ProductInventory | null;
}

export interface StorefrontProduct {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  category: {
    id: string;
    name: string;
    slug?: string;
  };
  images: ProductImage[];
  variants: ProductVariant[];
}

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const data = await response.json();

    if (typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // Ignore invalid JSON response.
  }

  return fallback;
}

export async function getProducts(): Promise<StorefrontProduct[]> {
  const response = await fetch(
    `${API_BASE_URL}/products`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_LIST_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}

export async function getProductById(
  id: string,
): Promise<StorefrontProduct> {
  const response = await fetch(
    `${API_BASE_URL}/products/${id}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_DETAIL_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}

export async function getProductBySlug(
  slug: string,
): Promise<StorefrontProduct> {
  const response = await fetch(
    `${API_BASE_URL}/products/slug/${encodeURIComponent(slug)}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_DETAIL_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}

export async function getProductsByCategory(
  categoryId: string,
): Promise<StorefrontProduct[]> {
  const response = await fetch(
    `${API_BASE_URL}/products/category/${encodeURIComponent(categoryId)}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_CATEGORY_LIST_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}
