
import { API_BASE_URL } from "./api-config";

export type ReturnStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REFUNDED";

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPING"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export type PaymentMethod =
  | "COD"
  | "BANK_TRANSFER"
  | "WALLET"
  | "ONLINE";

export type PaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export type AccountPlatform =
  | "MEMBER"
  | "FRANCHISE";

export type CommissionStatus =
  | "PENDING"
  | "APPROVED"
  | "PAID"
  | "CANCELLED";

export interface AdminReturnCustomer {
  id: string;
  platform: AccountPlatform;
  person: {
    fullName: string;
    email: string;
    phone: string;
  };
}

export interface AdminReturnOrderList {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: string;
  shippingFee: string;
  discount: string;
  totalAmount: string;
  createdAt: string;
  deliveredAt: string | null;

  account: AdminReturnCustomer;
}

export interface AdminReturnListItem {
  id: string;
  orderId: string;
  status: ReturnStatus;
  note: string | null;
  requestedAt: string;
  approvedAt: string | null;
  refundedAt: string | null;

  order: AdminReturnOrderList;
}

export interface AdminReturnAccountDetail {
  id: string;
  personId: string;
  platform: AccountPlatform;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  updatedAt: string;

  person: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
  };

  memberProfile: {
    id: string;
    accountId: string;
    createdAt: string;
    updatedAt: string;
    referralCode: string;
  } | null;

  franchiseProfile: unknown | null;
}

export interface AdminReturnAddress {
  id: string;
  personId: string;
  type: string;
  receiverName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  province: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReturnOrderItem {
  id: string;
  orderId: string;
  variantId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;

  variant: {
    id: string;
    productId: string;
    sku: string;
    name: string;
    price: string;
    compareAtPrice: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

export interface AdminReturnCommission {
  id: string;
  orderId: string;
  status: CommissionStatus;
  [key: string]: unknown;
}

export interface AdminReturnOrderDetail {
  id: string;
  accountId: string;
  addressId: string | null;
  orderNumber: string;
  platform: AccountPlatform;

  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;

  subtotal: string;
  shippingFee: string;
  discount: string;
  totalAmount: string;

  createdAt: string;
  updatedAt: string;

  commissionEligibleAt?: string | null;
  deliveredAt: string | null;
  customerReceivedAt?: string | null;
  estimatedDeliveryAt?: string | null;
  shippedAt?: string | null;

  account: AdminReturnAccountDetail;
  address: AdminReturnAddress | null;
  items: AdminReturnOrderItem[];
  commissionTransactions: AdminReturnCommission[];
}

export interface AdminReturnDetail {
  id: string;
  orderId: string;
  status: ReturnStatus;
  note: string | null;
  requestedAt: string;
  approvedAt: string | null;
  refundedAt: string | null;

  order: AdminReturnOrderDetail;
}

export interface RejectAdminReturnInput {
  note?: string;
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

export async function getAdminReturns(
  accessToken: string,
  status?: ReturnStatus,
): Promise<AdminReturnListItem[]> {
  const query = status
    ? `?status=${encodeURIComponent(status)}`
    : "";

  const response = await fetch(
    `${API_BASE_URL}/admin/returns${query}`,
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
        "RETURN_LIST_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminReturnById(
  accessToken: string,
  id: string,
): Promise<AdminReturnDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admin/returns/${encodeURIComponent(id)}`,
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
        "RETURN_DETAIL_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function approveAdminReturn(
  accessToken: string,
  id: string,
): Promise<AdminReturnDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admin/returns/${encodeURIComponent(id)}/approve`,
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
        "RETURN_APPROVE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function rejectAdminReturn(
  accessToken: string,
  id: string,
  input: RejectAdminReturnInput = {},
): Promise<AdminReturnDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admin/returns/${encodeURIComponent(id)}/reject`,
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
        "RETURN_REJECT_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

