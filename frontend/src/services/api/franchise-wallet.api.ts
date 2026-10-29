import { getAccessToken } from "../../utils/auth";

import { API_BASE_URL } from "./api-config";

export interface FranchiseWalletBalance {
  balance: string;
  reservedBalance: string;
  availableBalance: string;
}

export type FranchiseWalletTransactionType =
  | "TOP_UP"
  | "COMMISSION"
  | "ORDER_PAYMENT"
  | "WITHDRAWAL"
  | "REFUND"
  | "ADJUSTMENT";

export interface FranchiseWalletTransaction {
  id: string;
  walletId: string;
  type: FranchiseWalletTransactionType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  description: string | null;
  createdAt: string;
}

export interface FranchiseWithdrawalBankAccount {
  id: string;
  accountNumber: string;
  status: "ACTIVE";
}

export interface CreateFranchiseWithdrawalRequest {
  bankAccountId: string;
  amount: number;
  note?: string;
}

export interface FranchiseWithdrawalRequestResult {
  id: string;
  amount: string;
  status: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function requestFranchiseWallet<T>(
  path: string,
): Promise<T> {
  const accessToken = getAccessToken("FRANCHISE");

  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  let result: ApiResponse<T>;

  try {
    result = await response.json();
  } catch {
    throw new Error("INVALID_API_RESPONSE");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ?? "FRANCHISE_WALLET_REQUEST_FAILED",
    );
  }

  return result.data;
}

async function postFranchiseWallet<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const accessToken = getAccessToken("FRANCHISE");

  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let result: ApiResponse<T>;

  try {
    result = await response.json();
  } catch {
    throw new Error("INVALID_API_RESPONSE");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error ?? "FRANCHISE_WALLET_REQUEST_FAILED",
    );
  }

  return result.data;
}

export async function getFranchiseWalletTransactions(
  accountId: string,
): Promise<FranchiseWalletTransaction[]> {
  return requestFranchiseWallet<FranchiseWalletTransaction[]>(
    `/wallets/${encodeURIComponent(accountId)}/transactions`,
  );
}

export async function getFranchiseWithdrawalBankAccounts(
  accountId: string,
): Promise<FranchiseWithdrawalBankAccount[]> {
  return requestFranchiseWallet<FranchiseWithdrawalBankAccount[]>(
    `/wallets/${encodeURIComponent(accountId)}/bank-accounts`,
  );
}

export async function createFranchiseWithdrawalRequest(
  accountId: string,
  data: CreateFranchiseWithdrawalRequest,
): Promise<FranchiseWithdrawalRequestResult> {
  return postFranchiseWallet<FranchiseWithdrawalRequestResult>(
    `/wallets/${encodeURIComponent(accountId)}/withdrawals`,
    data,
  );
}
