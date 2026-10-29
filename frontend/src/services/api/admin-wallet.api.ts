
import { API_BASE_URL } from "./api-config";

export type WalletPlatform = "MEMBER" | "FRANCHISE";

export type WalletAccountStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "LOCKED";

export type WalletSortBy = "createdAt" | "balance";

export type WalletSortOrder = "asc" | "desc";

export type WalletTransactionType =
  | "COMMISSION"
  | "TOP_UP"
  | "REFUND"
  | "ORDER_PAYMENT"
  | "WITHDRAWAL";


export type FinancialAdjustmentDirection = "CREDIT" | "DEBIT";

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

  recipient: {
    id: string;
    platform: WalletPlatform;
    email: string | null;
    phone: string | null;
    status: string;
    person: {
      fullName: string;
    };
  };

  createdBy: {
    id: string;
    username: string;
  };

  confirmedBy: {
    id: string;
    username: string;
  } | null;

  walletTransaction: AdminWalletTransaction | null;
}

export interface AdminFinancialAdjustmentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminFinancialAdjustmentListParams {
  page?: number;
  limit?: 10 | 20 | 50;
  search?: string;
  status?: FinancialAdjustmentStatus;
}

export interface CreateFinancialAdjustmentInput {
  recipientAccountId: string;
  direction: FinancialAdjustmentDirection;
  amount: number;
  reason: FinancialAdjustmentReason;
  note?: string;
  complaintId?: string;
}

export interface AdminFinancialAdjustmentListResult {
  items: AdminFinancialAdjustment[];
  pagination: AdminFinancialAdjustmentPagination;
}

export interface AdminWallet {
  id: string;
  accountId: string;
  balance: string;
  createdAt: string;
  updatedAt: string;

  account: {
    id: string;
    platform: WalletPlatform;
    status: string;

    person: {
      id: string;
      fullName: string;
      email: string | null;
      phone: string | null;
    };
  };
}

export interface AdminWalletDetail extends AdminWallet {
  account: AdminWallet["account"] & {
    memberProfile: {
      referralCode: string;
    } | null;

    franchiseProfile: {
      franchiseCode: string;
      status: string;
    } | null;
  };
}

export interface AdminWalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  description: string | null;
  createdAt: string;
}

export interface AdminWalletPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminWalletListResult {
  data: AdminWallet[];
  pagination: AdminWalletPagination;
}

export interface AdminWalletListParams {
  page?: number;
  limit?: 10 | 20 | 50;
  search?: string;
  platform?: WalletPlatform;
  status?: WalletAccountStatus;
  sortBy?: WalletSortBy;
  sortOrder?: WalletSortOrder;
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

export async function getAdminWallets(
  accessToken: string,
  params: AdminWalletListParams = {},
): Promise<AdminWalletListResult> {
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

  if (params.platform) {
    query.set("platform", params.platform);
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.sortBy) {
    query.set("sortBy", params.sortBy);
  }

  if (params.sortOrder) {
    query.set("sortOrder", params.sortOrder);
  }

  const queryString = query.toString();

  const url = `${API_BASE_URL}/admin/wallets${queryString ? `?${queryString}` : ""
    }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "ADMIN_WALLET_LIST_FAILED",
      ),
    );
  }

  const result = await response.json();

  return {
    data: result.data,
    pagination: result.pagination,
  };
}

export async function getAdminWalletByAccountId(
  accessToken: string,
  accountId: string,
): Promise<AdminWalletDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admin/wallets/${accountId}`,
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
        "ADMIN_WALLET_DETAIL_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminWalletTransactions(
  accessToken: string,
  accountId: string,
): Promise<AdminWalletTransaction[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/wallets/${accountId}/transactions`,
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
        "ADMIN_WALLET_TRANSACTIONS_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminFinancialAdjustments(
  accessToken: string,
  params: AdminFinancialAdjustmentListParams = {},
): Promise<AdminFinancialAdjustmentListResult> {
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

  const response = await fetch(
    `${API_BASE_URL}/admin/financial-adjustments${queryString ? `?${queryString}` : ""
    }`,
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
        "ADMIN_FINANCIAL_ADJUSTMENT_LIST_FAILED",
      ),
    );
  }

  const result = await response.json();

  return {
    items: result.items,
    pagination: result.pagination,
  };
}

export async function getAdminFinancialAdjustmentByCode(
  accessToken: string,
  ticketCode: string,
): Promise<AdminFinancialAdjustment> {
  const response = await fetch(
    `${API_BASE_URL}/admin/financial-adjustments/${encodeURIComponent(ticketCode)}`,
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
        "ADMIN_FINANCIAL_ADJUSTMENT_DETAIL_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}

export async function createAdminFinancialAdjustment(
  accessToken: string,
  input: CreateFinancialAdjustmentInput,
): Promise<AdminFinancialAdjustment> {
  const response = await fetch(
    `${API_BASE_URL}/admin/financial-adjustments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "ADMIN_FINANCIAL_ADJUSTMENT_CREATE_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}

export async function confirmAdminFinancialAdjustment(
  accessToken: string,
  ticketCode: string,
  password: string,
): Promise<AdminFinancialAdjustment> {
  const response = await fetch(
    `${API_BASE_URL}/admin/financial-adjustments/${encodeURIComponent(ticketCode)}/confirm`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "ADMIN_FINANCIAL_ADJUSTMENT_CONFIRM_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}

