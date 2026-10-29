import { getAccessToken } from "../../utils/auth";

import { API_BASE_URL } from "./api-config";

export type MemberPaymentMethod =
  | "COD"
  | "BANK_TRANSFER"
  | "WALLET";

export interface MemberCheckoutInput {
  addressId: string | number;
  paymentMethod: MemberPaymentMethod;
}

export interface MemberCheckoutOrder {
  id: string | number;
  orderNumber?: string;
  status: string;
  paymentStatus?: string;
  paymentMethod: MemberPaymentMethod;
  subtotal?: string | number;
  shippingFee?: string | number;
  discount?: string | number;
  totalAmount?: string | number;
  createdAt?: string;
}

export async function checkoutMemberCart(
  accountId: string,
  input: MemberCheckoutInput,
): Promise<MemberCheckoutOrder> {
  const accessToken = getAccessToken("MEMBER");

  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const response = await fetch(
    `${API_BASE_URL}/checkout/${encodeURIComponent(accountId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        platform: "MEMBER",
        addressId: input.addressId,
        paymentMethod: input.paymentMethod,
      }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "CHECKOUT_FAILED");
  }

  return data.data as MemberCheckoutOrder;
}


export interface MemberPaymentInstruction {
  id: string;
  type: string;
  status: string;
  expectedAmount: string;
  receivedAmount: string;
  transferContent: string;
  createdAt: string;
  expiresAt: string;
  bankAccount: {
    accountNumber: string;
  } | null;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    paymentMethod: MemberPaymentMethod;
    totalAmount: string;
  } | null;
}

export async function getMemberOrderPaymentInstruction(
  orderId: string | number,
): Promise<MemberPaymentInstruction> {
  const accessToken = getAccessToken("MEMBER");

  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const response = await fetch(
    `${API_BASE_URL}/orders/${encodeURIComponent(String(orderId))}/payment-instruction`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok || data?.success !== true) {
    throw new Error(
      data?.error ?? "GET_PAYMENT_INSTRUCTION_FAILED",
    );
  }

  return data.data as MemberPaymentInstruction;
}


export interface MemberOrderItem {
  id: string | number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string | number;
  subtotal: string | number;
  variant?: {
    id: string | number;
    name: string;
    sku: string;
  } | null;
}

export interface MemberOrder {
  id: string | number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: MemberPaymentMethod;
  subtotal: string | number;
  shippingFee: string | number;
  discount: string | number;
  totalAmount: string | number;
  createdAt: string;
  items: MemberOrderItem[];
}

export async function getMyMemberOrders(): Promise<MemberOrder[]> {
  const accessToken = getAccessToken("MEMBER");

  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const response = await fetch(`${API_BASE_URL}/orders/my`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok || data?.success !== true) {
    throw new Error(data?.error ?? "GET_MEMBER_ORDERS_FAILED");
  }

  return data.data as MemberOrder[];
}

