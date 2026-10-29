import { API_BASE_URL } from "./api-config";

export type MockBankOwnerType = "USER" | "SHOP";
export type MockBankAccountStatus = "ACTIVE" | "LOCKED";
export type MockBankTransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "TRANSFER";

export interface MockBankAccount {
  id: string;
  accountNumber: string;
  ownerAccountId: string | null;
  ownerType: MockBankOwnerType;
  balance: string;
  status: MockBankAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MockBankTransaction {
  id: string;
  fromBankAccountId: string | null;
  toBankAccountId: string | null;
  type: MockBankTransactionType;
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

interface MockBankApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  let result: MockBankApiResponse<T>;

  try {
    result = await response.json();
  } catch {
    throw new Error("MOCKBANK_INVALID_RESPONSE");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error || `MOCKBANK_REQUEST_FAILED_${response.status}`,
    );
  }

  return result.data;
}

export async function getMockBankAccounts(): Promise<
  MockBankAccount[]
> {
  return request<MockBankAccount[]>("/bank/accounts");
}

export async function getMockBankAccount(
  id: string,
): Promise<MockBankAccount> {
  return request<MockBankAccount>(
    `/bank/accounts/${encodeURIComponent(id)}`,
  );
}

export async function getMockBankBalance(
  id: string,
): Promise<string> {
  const result = await request<{ balance: string | number }>(
    `/bank/accounts/${encodeURIComponent(id)}/balance`,
  );

  return String(result.balance);
}

export async function createMockBankAccount(input: {
  ownerType: MockBankOwnerType;
  ownerAccountId?: string;
}): Promise<MockBankAccount> {
  return request<MockBankAccount>("/bank/accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function depositMockBankAccount(
  id: string,
  input: {
    amount: number;
    description?: string;
  },
): Promise<unknown> {
  return request<unknown>(
    `/bank/accounts/${encodeURIComponent(id)}/deposit`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function transferMockBank(
  input: {
    fromBankAccountId: string;
    toBankAccountId: string;
    amount: number;
    description?: string;
  },
): Promise<MockBankTransaction> {
  return request<MockBankTransaction>("/bank/transfers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getMockBankTransactions(
  accountId?: string,
): Promise<MockBankTransaction[]> {
  const query = accountId
    ? `?accountId=${encodeURIComponent(accountId)}`
    : "";

  return request<MockBankTransaction[]>(
    `/bank/transactions${query}`,
  );
}
