import { getAccessToken } from "../../utils/auth";

import { API_BASE_URL } from "./api-config";

export interface MemberCartInventory {
  quantity: number;
  reservedQty: number;
}

export interface MemberCartVariant {
  id: string;
  sku: string;
  name: string | null;
  price: string;
  compareAtPrice: string | null;
  status: string;
  product: {
    id: string;
    name: string;
    slug: string;
    status: string;
    images?: {
      id: string;
      url: string;
      sortOrder: number;
      isPrimary: boolean;
    }[];
    [key: string]: unknown;
  };
  inventory: MemberCartInventory | null;
}

export interface MemberCartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
  variant: MemberCartVariant;
}

export interface MemberCart {
  id: string;
  accountId: string;
  items: MemberCartItem[];
}

export interface AddMemberCartItemInput {
  variantId: string;
  quantity: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export function notifyMemberCartUpdated() {
  window.dispatchEvent(
    new Event("member-cart-updated"),
  );
}

async function requestMemberCart<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = getAccessToken("MEMBER");
  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...options,
      headers: {
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    },
  );

  let result: ApiResponse<T>;

  try {
    result = await response.json();
  } catch {
    throw new Error("INVALID_API_RESPONSE");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ?? "MEMBER_CART_REQUEST_FAILED",
    );
  }

  return result.data;
}

export async function getMemberCart(
  accountId: string,
): Promise<MemberCart> {
  return requestMemberCart<MemberCart>(
    `/carts/${encodeURIComponent(accountId)}`,
  );
}

export async function addMemberCartItem(
  accountId: string,
  input: AddMemberCartItemInput,
): Promise<MemberCartItem> {
  const result = await requestMemberCart<MemberCartItem>(
    `/carts/${encodeURIComponent(accountId)}/items`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  notifyMemberCartUpdated();

  return result;
}

export async function updateMemberCartItem(
  accountId: string,
  variantId: string,
  quantity: number,
): Promise<MemberCartItem> {
  const result = await requestMemberCart<MemberCartItem>(
    `/carts/${encodeURIComponent(accountId)}/items/${encodeURIComponent(variantId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    },
  );

  notifyMemberCartUpdated();

  return result;
}

export async function removeMemberCartItem(
  accountId: string,
  variantId: string,
): Promise<{
  success: boolean;
  cartItemId: string;
}> {
  const result = await requestMemberCart<{
    success: boolean;
    cartItemId: string;
  }>(
    `/carts/${encodeURIComponent(accountId)}/items/${encodeURIComponent(variantId)}`,
    {
      method: "DELETE",
    },
  );

  notifyMemberCartUpdated();

  return result;
}

export async function clearMemberCart(
  accountId: string,
): Promise<{
  success: boolean;
  deletedItems: number;
}> {
  const result = await requestMemberCart<{
    success: boolean;
    deletedItems: number;
  }>(
    `/carts/${encodeURIComponent(accountId)}/items`,
    {
      method: "DELETE",
    },
  );

  notifyMemberCartUpdated();

  return result;
}
