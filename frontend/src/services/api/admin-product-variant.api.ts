
import { API_BASE_URL } from "./api-config";

export type ProductVariantStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface AdminProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  status: ProductVariantStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductVariantInput {
  productId: string;
  name: string;
  sku: string;
  price: number;
  compareAtPrice?: number;
  status?: ProductVariantStatus;
}

export interface UpdateProductVariantInput {
  productId?: string;
  name?: string;
  sku?: string;
  price?: number;
  compareAtPrice?: number;
  status?: ProductVariantStatus;
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

export async function getAdminProductVariants(
  accessToken: string,
  productId: string,
): Promise<AdminProductVariant[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/products/${productId}/variants`,
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
        "PRODUCT_VARIANT_LIST_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminProductVariantById(
  accessToken: string,
  id: string,
): Promise<AdminProductVariant> {
  const response = await fetch(
    `${API_BASE_URL}/admin/product-variants/${id}`,
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
        "PRODUCT_VARIANT_DETAIL_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function createAdminProductVariant(
  accessToken: string,
  input: CreateProductVariantInput,
): Promise<AdminProductVariant> {
  const response = await fetch(
    `${API_BASE_URL}/admin/product-variants`,
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
        "PRODUCT_VARIANT_CREATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function updateAdminProductVariant(
  accessToken: string,
  id: string,
  input: UpdateProductVariantInput,
): Promise<AdminProductVariant> {
  const response = await fetch(
    `${API_BASE_URL}/admin/product-variants/${id}`,
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
        "PRODUCT_VARIANT_UPDATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function updateAdminProductVariantStatus(
  accessToken: string,
  id: string,
  status: ProductVariantStatus,
): Promise<AdminProductVariant> {
  const response = await fetch(
    `${API_BASE_URL}/admin/product-variants/${id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        status,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "PRODUCT_VARIANT_STATUS_UPDATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}


