import { API_BASE_URL } from "./api-config";

export interface AdminCommission {
  id: string;
  orderId: string;
  accountId: string;
  platform: "MEMBER" | "FRANCHISE";
  sourceType: string;
  commissionBase: string;
  percentage: string;
  amount: string;
  status: "PENDING" | "APPROVED" | "PAID";
  createdAt: string;
  updatedAt: string;

  account: {
    id: string;
    platform: "MEMBER" | "FRANCHISE";
    person: {
      fullName: string;
      email: string;
    };
  };

  order: {
    id: string;
    orderNumber: string;
    status:
      | "PENDING"
      | "CONFIRMED"
      | "PROCESSING"
      | "SHIPPING"
      | "DELIVERED"
      | "CANCELLED"
      | "RETURNED";
    paymentStatus:
      | "UNPAID"
      | "PENDING"
      | "PAID"
      | "FAILED"
      | "REFUNDED";
    paymentMethod:
      | "COD"
      | "BANK_TRANSFER"
      | "WALLET"
      | "ONLINE";
    totalAmount: string;
    commissionEligibleAt: string | null;
  };

  rule: {
    id: string;
    name: string;
    percentage: string;
    thresholdAmount: string;
  } | null;
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

export async function getAdminCommissions(
  accessToken: string,
): Promise<AdminCommission[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/commissions`,
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
        "ADMIN_COMMISSION_LIST_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}
