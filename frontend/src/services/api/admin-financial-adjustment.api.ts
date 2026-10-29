import { API_BASE_URL } from "./api-config";

export type FinancialAdjustmentDirection =
  | "CREDIT"
  | "DEBIT";

export type FinancialAdjustmentStatus =
  | "PENDING"
  | "COMPLETED"
  | "EXPIRED";

export type FinancialAdjustmentReason =
  | "LATE_BANK_TRANSFER"
  | "MEMBER_COMPLAINT"
  | "FRANCHISE_COMPLAINT"
  | "COMPENSATION"
  | "TRANSACTION_CORRECTION"
  | "OTHER";

export interface FinancialAdjustmentRecipient {
  id: string;
  platform: "MEMBER" | "FRANCHISE";
  email: string | null;
  phone: string | null;
  status: string;
  person: {
    fullName: string;
  };
}

export interface FinancialAdjustmentAdmin {
  id: string;
  username: string;
}

export interface FinancialAdjustmentWalletTransaction {
  id: string;
  walletId: string;
  type: string;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  description: string | null;
  createdAt: string;
}

export interface AdminFinancialAdjustment {
  id: string;
  ticketCode: string;
  recipientAccountId: string;
  createdByAdminId: string;
  confirmedByAdminId: string | null;
  walletTransactionId: string | null;
  direction: FinancialAdjustmentDirection;
  amount: string;
  reason: FinancialAdjustmentReason;
  note: string | null;
  status: FinancialAdjustmentStatus;
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  recipient: FinancialAdjustmentRecipient;
  createdBy: FinancialAdjustmentAdmin;
  confirmedBy: FinancialAdjustmentAdmin | null;
  walletTransaction: FinancialAdjustmentWalletTransaction | null;
}

export interface FinancialAdjustmentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FinancialAdjustmentListParams {
  page?: number;
  limit?: 10 | 20 | 50;
  search?: string;
  status?: FinancialAdjustmentStatus;
}

export interface FinancialAdjustmentListResult {
  items: AdminFinancialAdjustment[];
  pagination: FinancialAdjustmentPagination;
}

export interface CreateFinancialAdjustmentInput {
  recipientAccountId: string;
  direction: FinancialAdjustmentDirection;
  amount: string;
  reason: FinancialAdjustmentReason;
  note?: string;
}

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
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

async function requestFinancialAdjustment<T>(
  accessToken: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}/admin/financial-adjustments${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "FINANCIAL_ADJUSTMENT_REQUEST_FAILED",
      ),
    );
  }

  const result = await response.json();

  if (result.success !== true) {
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : "FINANCIAL_ADJUSTMENT_REQUEST_FAILED",
    );
  }

  return result as T;
}

export async function getAdminFinancialAdjustments(
  accessToken: string,
  params: FinancialAdjustmentListParams = {},
): Promise<FinancialAdjustmentListResult> {
  const query = new URLSearchParams();

  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  if (params.status) {
    query.set("status", params.status);
  }

  const queryString = query.toString();

  const result = await requestFinancialAdjustment<{
    success: true;
    items: AdminFinancialAdjustment[];
    pagination: FinancialAdjustmentPagination;
  }>(
    accessToken,
    queryString ? `?${queryString}` : "",
  );

  return {
    items: result.items,
    pagination: result.pagination,
  };
}

export async function getAdminFinancialAdjustment(
  accessToken: string,
  ticketCode: string,
): Promise<AdminFinancialAdjustment> {
  const result = await requestFinancialAdjustment<{
    success: true;
    data: AdminFinancialAdjustment;
  }>(
    accessToken,
    `/${encodeURIComponent(ticketCode)}`,
  );

  return result.data;
}

export async function createAdminFinancialAdjustment(
  accessToken: string,
  input: CreateFinancialAdjustmentInput,
): Promise<AdminFinancialAdjustment> {
  const result = await requestFinancialAdjustment<{
    success: true;
    data: AdminFinancialAdjustment;
  }>(
    accessToken,
    "",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return result.data;
}

export async function confirmAdminFinancialAdjustment(
  accessToken: string,
  ticketCode: string,
  password: string,
): Promise<AdminFinancialAdjustment> {
  const result = await requestFinancialAdjustment<{
    success: true;
    data: AdminFinancialAdjustment;
  }>(
    accessToken,
    `/${encodeURIComponent(ticketCode)}/confirm`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    },
  );

  return result.data;
}

