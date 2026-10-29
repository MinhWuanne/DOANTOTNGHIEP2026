import { getAccessToken } from "../../utils/auth";

import { API_BASE_URL } from "./api-config";

export type MemberReturnStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REFUNDED";

export interface MemberReturnOrderItem {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  variant: {
    id: string;
    name: string;
    sku: string;
  } | null;
}

export interface MemberReturnOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  subtotal: string;
  shippingFee: string;
  discount: string;
  totalAmount: string;
  createdAt: string;
  deliveredAt?: string | null;
  items: MemberReturnOrderItem[];
}

export interface MemberReturnRequest {
  id: string;
  orderId: string;
  status: MemberReturnStatus;
  note: string | null;
  requestedAt: string;
  approvedAt: string | null;
  refundedAt: string | null;
  order: MemberReturnOrder;
}

async function requestMemberReturn<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = getAccessToken("MEMBER");

  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok || data?.success !== true) {
    throw new Error(
      data?.error ?? "MEMBER_RETURN_REQUEST_FAILED",
    );
  }

  return data.data as T;
}

export function getMyMemberReturns(): Promise<MemberReturnRequest[]> {
  return requestMemberReturn<MemberReturnRequest[]>("/returns/my");
}

export function getMyMemberReturnById(
  id: string | number,
): Promise<MemberReturnRequest> {
  return requestMemberReturn<MemberReturnRequest>(
    `/returns/${encodeURIComponent(String(id))}`,
  );
}

export interface CreateMemberReturnInput {
  orderId: string | number;
  note?: string;
}

export function createMemberReturn(
  input: CreateMemberReturnInput,
): Promise<MemberReturnRequest> {
  return requestMemberReturn<MemberReturnRequest>("/returns", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

