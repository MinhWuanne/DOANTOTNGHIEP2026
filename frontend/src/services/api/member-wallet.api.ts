
import { getAccessToken } from "../../utils/auth";

import { API_BASE_URL } from "./api-config";

export interface MemberWalletBalance {
  balance: string;
  reservedBalance: string;
  availableBalance: string;
}

export interface MemberWalletTopUpInstruction {
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
}

export interface CreateMemberWalletTopUpRequest {
  amount: number;
}

export type MemberWalletTransactionType =
  | "TOP_UP"
  | "COMMISSION"
  | "ORDER_PAYMENT"
  | "WITHDRAWAL"
  | "REFUND"
  | "ADJUSTMENT";

export interface MemberWalletTransaction {
  id: string;
  walletId: string;
  type: MemberWalletTransactionType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  description: string | null;
  createdAt: string;
}

export interface MemberWithdrawalBankAccount {
  id: string;
  accountNumber: string;
  status: "ACTIVE";
}

export interface CreateMemberWithdrawalRequest {
  bankAccountId: string;
  amount: number;
  note?: string;
}

export interface MemberWithdrawalRequestResult {
  id: string;
  amount: string;
  status: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function requestMemberWallet<T>(
  path: string,
): Promise<T> {
  const accessToken = getAccessToken("MEMBER");

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
      result.error ?? "MEMBER_WALLET_REQUEST_FAILED",
    );
  }

  return result.data;
}

async function postMemberWallet<T>(
  path: string,
  body: unknown,
): Promise<T> {
  const accessToken = getAccessToken("MEMBER");

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
      result.error ?? "MEMBER_WALLET_REQUEST_FAILED",
    );
  }

  return result.data;
}

export async function getMemberWalletBalance(
  accountId: string,
): Promise<MemberWalletBalance> {
  return requestMemberWallet<MemberWalletBalance>(
    `/wallets/${encodeURIComponent(accountId)}/balance`,
  );
}

export async function getMemberWalletTransactions(
  accountId: string,
): Promise<MemberWalletTransaction[]> {
  return requestMemberWallet<MemberWalletTransaction[]>(
    `/wallets/${encodeURIComponent(accountId)}/transactions`,
  );
}

export async function getMemberWithdrawalBankAccounts(
  accountId: string,
): Promise<MemberWithdrawalBankAccount[]> {
  return requestMemberWallet<MemberWithdrawalBankAccount[]>(
    `/wallets/${encodeURIComponent(accountId)}/bank-accounts`,
  );
}

export async function createMemberWithdrawalRequest(
  accountId: string,
  data: CreateMemberWithdrawalRequest,
): Promise<MemberWithdrawalRequestResult> {
  return postMemberWallet<MemberWithdrawalRequestResult>(
    `/wallets/${encodeURIComponent(accountId)}/withdrawals`,
    data,
  );
}

export async function createMemberWalletTopUpInstruction(
  accountId: string,
  data: CreateMemberWalletTopUpRequest,
): Promise<MemberWalletTopUpInstruction> {
  return postMemberWallet<MemberWalletTopUpInstruction>(
    `/wallets/${encodeURIComponent(accountId)}/top-up-instruction`,
    data,
  );
}

