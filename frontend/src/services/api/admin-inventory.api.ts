
import { API_BASE_URL } from "./api-config";

export type ProductStatus =
  | "ACTIVE"
  | "INACTIVE";

export interface AdminInventoryProduct {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
}

export interface AdminInventoryVariant {
  id: string;
  name: string | null;
  sku: string;
  status: ProductStatus;
  product: AdminInventoryProduct;
}

export interface AdminInventory {
  id: string;
  variantId: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  updatedAt: string;
  variant: AdminInventoryVariant;
}

export interface CreateInventoryInput {
  variantId: string;
  quantity?: number;
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

// =====================================================
// Get all inventories
// =====================================================

export async function getAdminInventories(
  accessToken: string,
  productId?: string,
): Promise<AdminInventory[]> {
  const url = new URL(
    `${API_BASE_URL}/inventories`,
  );

  if (productId) {
    url.searchParams.set(
      "productId",
      productId,
    );
  }

  const response = await fetch(
    url.toString(),
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
        "INVENTORY_LIST_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

// =====================================================
// Get inventory by Variant
// =====================================================

export async function getAdminInventoryByVariantId(
  accessToken: string,
  variantId: string,
): Promise<AdminInventory | null> {
  const response = await fetch(
    `${API_BASE_URL}/inventories/${variantId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (response.status === 404) {
    const data = await response.json();

    if (data.error === "INVENTORY_NOT_FOUND") {
      return null;
    }
  }

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "INVENTORY_DETAIL_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

// =====================================================
// Create Inventory
// =====================================================

export async function createAdminInventory(
  accessToken: string,
  input: CreateInventoryInput,
): Promise<AdminInventory> {
  const response = await fetch(
    `${API_BASE_URL}/inventories`,
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
        "INVENTORY_CREATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}


