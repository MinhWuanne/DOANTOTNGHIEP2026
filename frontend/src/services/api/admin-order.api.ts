import { API_BASE_URL } from "./api-config";

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

export interface AdminOrderListItem {
  id: string;
  orderNumber: string;
  accountId: string;

  subtotal: string;
  shippingFee: string;
  discount: string;
  totalAmount: string;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;

  createdAt: string;
  updatedAt: string;

  account: {
    id: string;
    platform: AccountPlatform;

    person: {
      fullName: string;
      email: string;
    };
  };
}

export interface AdminOrderDetail {
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

  commissionEligibleAt: string | null;
  deliveredAt: string | null;
  customerReceivedAt: string | null;
  estimatedDeliveryAt: string | null;
  shippedAt: string | null;

  account: {
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
  };

  address: {
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
  } | null;

  items: Array<{
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

      product: {
        id: string;
        categoryId: string;
        name: string;
        slug: string;
        description: string | null;
        status: string;
        createdAt: string;
        updatedAt: string;
      };
    };
  }>;

  commissionTransactions: unknown[];
}

export interface UpdateAdminOrderStatusInput {
  status: OrderStatus;
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

export async function getAdminOrders(
  accessToken: string,
): Promise<AdminOrderListItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/orders`,
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
        "ORDER_LIST_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminOrderById(
  accessToken: string,
  id: string,
): Promise<AdminOrderDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admin/orders/${id}`,
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
        "ORDER_DETAIL_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function updateAdminOrderStatus(
  accessToken: string,
  id: string,
  input: UpdateAdminOrderStatusInput,
): Promise<AdminOrderDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admin/orders/${id}/status`,
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
        "ORDER_STATUS_UPDATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}
