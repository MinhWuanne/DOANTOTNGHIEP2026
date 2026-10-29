import { API_BASE_URL } from "./api-config";

export type WithdrawalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "COMPLETED";

export type WithdrawalPlatform =
  | "MEMBER"
  | "FRANCHISE";

export interface AdminWithdrawal {
  id: string;
  walletId: string;
  bankAccountId: string | null;
  amount: string;
  status: WithdrawalStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;

  wallet: {
    id: string;
    account: {
      id: string;
      platform: WithdrawalPlatform;
      person: {
        id: string;
        fullName: string;
      };
    };
  };

  bankAccount: {
    id: string;
    accountNumber: string;
    ownerType: string;
    status: string;
  } | null;
}

export interface AdminWithdrawalDetail
  extends AdminWithdrawal {
  wallet: {
    id: string;
    account: {
      id: string;
      platform: WithdrawalPlatform;
      status: string;
      person: {
        id: string;
        fullName: string;
        email: string | null;
        phone: string | null;
      };
    };
  };

  bankAccount: {
    id: string;
    accountNumber: string;
    ownerAccountId: string | null;
    ownerType: string;
    balance: string;
    status: string;
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
  } catch {}

  return fallback;
}

export async function getAdminWithdrawals(
  accessToken: string,
): Promise<AdminWithdrawal[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/withdrawals`,
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
        "ADMIN_WITHDRAWAL_LIST_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminWithdrawalById(
  accessToken: string,
  withdrawalId: string,
): Promise<AdminWithdrawalDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admin/withdrawals/${withdrawalId}`,
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
        "ADMIN_WITHDRAWAL_DETAIL_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function approveAdminWithdrawal(
  accessToken: string,
  withdrawalId: string,
): Promise<AdminWithdrawal> {
  const response = await fetch(
    `${API_BASE_URL}/admin/withdrawals/${withdrawalId}/approve`,
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
        "ADMIN_WITHDRAWAL_APPROVE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function rejectAdminWithdrawal(
  accessToken: string,
  withdrawalId: string,
  note?: string,
): Promise<AdminWithdrawal> {
  const response = await fetch(
    `${API_BASE_URL}/admin/withdrawals/${withdrawalId}/reject`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        note === undefined ? {} : { note },
      ),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "ADMIN_WITHDRAWAL_REJECT_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function completeAdminWithdrawal(
  accessToken: string,
  withdrawalId: string,
): Promise<AdminWithdrawal> {
  const response = await fetch(
    `${API_BASE_URL}/admin/withdrawals/${withdrawalId}/complete`,
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
        "ADMIN_WITHDRAWAL_COMPLETE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

