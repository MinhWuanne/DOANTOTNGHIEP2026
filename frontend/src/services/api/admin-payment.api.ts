import { API_BASE_URL } from "./api-config";

export type PaymentStatus =
  | "UNPAID"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export interface UpdateAdminPaymentStatusInput {
  status: PaymentStatus;
}

export interface AdminPaymentResult {
  id: string;
  orderNumber: string;
  accountId: string;
  platform: "MEMBER" | "FRANCHISE";
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPING"
    | "DELIVERED"
    | "CANCELLED"
    | "RETURNED";
  paymentStatus: PaymentStatus;
  paymentMethod:
    | "COD"
    | "BANK_TRANSFER"
    | "WALLET"
    | "ONLINE";
  totalAmount: string;
  deliveredAt: string | null;
  commissionEligibleAt: string | null;
}

export interface AdminBankTransaction {
  id: string;
  type: "TRANSFER";
  amount: string;
  description: string | null;
  createdAt: string;
  paymentInstructionId: string | null;
  fromBankAccount: {
    id: string;
    accountNumber: string;
  } | null;
  toBankAccount: {
    id: string;
    accountNumber: string;
  } | null;
}

export interface AdminBankTransactionResult {
  success: boolean;
  data: AdminBankTransaction[];
}

export interface ProcessAdminBankTransactionResult {
  success: boolean;
  data: unknown;
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

export async function updateAdminPaymentStatus(
  accessToken: string,
  id: string,
  input: UpdateAdminPaymentStatusInput,
): Promise<AdminPaymentResult> {
  const response = await fetch(
    `${API_BASE_URL}/orders/${id}/payment-status`,
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
        "PAYMENT_STATUS_UPDATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getPendingAdminBankTransactions(
  accessToken: string,
): Promise<AdminBankTransaction[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/payments/bank-transactions/pending`,
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
        "BANK_TRANSACTIONS_FETCH_FAILED",
      ),
    );
  }

  const result: AdminBankTransactionResult =
    await response.json();

  return result.data;
}

export async function processAdminBankTransaction(
  accessToken: string,
  id: string,
): Promise<ProcessAdminBankTransactionResult> {
  const response = await fetch(
    `${API_BASE_URL}/admin/payments/bank-transactions/${encodeURIComponent(id)}/process`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "BANK_TRANSACTION_PROCESS_FAILED",
      ),
    );
  }

  return response.json();
}
