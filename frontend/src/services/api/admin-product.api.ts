import { API_BASE_URL } from "./api-config";

export type ProductStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface ProductCategory {
  id: string;
  name: string;
}

export interface AdminProduct {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
  category: ProductCategory;
}

export interface CreateProductInput {
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateProductInput {
  categoryId?: string;
  name?: string;
  slug?: string;
  description?: string;
  status?: ProductStatus;
}

export interface GetAdminProductsParams {
  page?: number;
  limit?: 10 | 20 | 50;
  search?: string;
  status?: "ALL" | ProductStatus;
}

export interface AdminProductsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminProductsSummary {
  total: number;
  active: number;
  inactive: number;
}

export interface AdminProductsResult {
  data: AdminProduct[];
  pagination: AdminProductsPagination;
  summary: AdminProductsSummary;
}

async function getErrorMessage(
  response: Response,
  fallback: string,
) {
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

export async function getAdminProducts(
  accessToken: string,
  params: GetAdminProductsParams = {},
): Promise<AdminProductsResult> {
  const searchParams = new URLSearchParams();

  searchParams.set(
    "page",
    String(params.page ?? 1),
  );

  searchParams.set(
    "limit",
    String(params.limit ?? 10),
  );

  if (params.search?.trim()) {
    searchParams.set(
      "search",
      params.search.trim(),
    );
  }

  if (
    params.status &&
    params.status !== "ALL"
  ) {
    searchParams.set(
      "status",
      params.status,
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/admin/products?${searchParams.toString()}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

  const data = await response.json();

  return {
    data: data.data,
    pagination: data.pagination,
    summary: data.summary,
  };
}

export async function getAdminProductById(
  accessToken: string,
  id: string,
): Promise<AdminProduct> {
  const response = await fetch(
    `${API_BASE_URL}/admin/products/${id}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
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

  const data = await response.json();

  return data.data;
}

export async function createAdminProduct(
  accessToken: string,
  input: CreateProductInput,
): Promise<AdminProduct> {
  const response = await fetch(
    `${API_BASE_URL}/admin/products`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_CREATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function updateAdminProduct(
  accessToken: string,
  id: string,
  input: UpdateProductInput,
): Promise<AdminProduct> {
  const response = await fetch(
    `${API_BASE_URL}/admin/products/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_UPDATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}


export interface AdminProductImage {
  id: string;
  productId: string;
  url: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export async function getAdminProductImages(
  accessToken: string,
  productId: string,
): Promise<AdminProductImage[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/products/${productId}/images`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_IMAGE_LIST_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}

export async function uploadAdminProductImage(
  accessToken: string,
  productId: string,
  file: File,
): Promise<AdminProductImage> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/admin/products/${productId}/images`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_IMAGE_UPLOAD_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}

export async function setAdminProductPrimaryImage(
  accessToken: string,
  productId: string,
  imageId: string,
): Promise<AdminProductImage> {
  const response = await fetch(
    `${API_BASE_URL}/admin/products/${productId}/images/${imageId}/primary`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_IMAGE_PRIMARY_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}

export async function deleteAdminProductImage(
  accessToken: string,
  productId: string,
  imageId: string,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/admin/products/${productId}/images/${imageId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_IMAGE_DELETE_FAILED",
      ),
    );
  }
}

