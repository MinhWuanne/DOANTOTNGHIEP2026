
import { getAccessToken } from "../../utils/auth";
import { getCurrentAuth } from "./auth.api";

import { API_BASE_URL } from "./api-config";

export interface FranchiseAuth {
  accountId: string;
  personId: string;
  platform: "FRANCHISE";
}

export interface FranchiseInvite {
  inviteCode: string;
}

export interface FranchiseNetworkStats {
  directDownline: number;
  otherDownline: number;
  totalDownline: number;
  totalDownlineOrders: number;
  totalDownlineRevenue: string | number;
}




export interface FranchiseDownlineAccount {
  id: string;
  personId: string;
  platform: "MEMBER" | "FRANCHISE";
  email: string | null;
  phone: string | null;
  status: string;
  level: number;
}


export interface FranchiseWalletBalance {
  balance: string;
  reservedBalance: string;
  availableBalance: string;
}

export type FranchiseCommissionPeriod =
  | "today"
  | "7days"
  | "week"
  | "month"
  | "year"
  | "custom";

export interface FranchiseCommissionSummary {
  totalOrders: number;
  totalCommission: number;
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
}

export interface FranchiseCommissionChartItem {
  period: string;
  amount: number;
  orders: number;
}

export interface FranchiseCommissionItem {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  createdAt: string;
}

export interface FranchiseCommissionsResponse {
  period: FranchiseCommissionPeriod;
  dateRange: {
    from: string;
    to: string;
  };
  summary: FranchiseCommissionSummary;
  chart: FranchiseCommissionChartItem[];
  items: FranchiseCommissionItem[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

async function requestFranchiseApi<T>(
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
    throw new Error(result.error ?? "FRANCHISE_API_REQUEST_FAILED");
  }

  return result.data;
}

export async function getFranchiseAuth(): Promise<FranchiseAuth> {
  const accessToken = getAccessToken("FRANCHISE");

  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const auth = await getCurrentAuth(accessToken) as FranchiseAuth;

  if (
    !auth.accountId ||
    auth.platform !== "FRANCHISE"
  ) {
    throw new Error("INVALID_FRANCHISE_ACCOUNT");
  }

  return auth;
}

export async function getFranchiseInviteCode(): Promise<FranchiseInvite> {
  return requestFranchiseApi<FranchiseInvite>(
    "/auth/franchise-invite",
  );
}

export async function getFranchiseNetworkStats(
  accountId: string,
): Promise<FranchiseNetworkStats> {
  return requestFranchiseApi<FranchiseNetworkStats>(
    `/accounts/${encodeURIComponent(accountId)}/network/stats`,
  );
}


export async function getFranchiseDirectDownline(
  accountId: string,
): Promise<FranchiseDownlineAccount[]> {
  return requestFranchiseApi<FranchiseDownlineAccount[]>(
    `/accounts/${encodeURIComponent(accountId)}/network/direct`,
  );
}

export async function getFranchiseAllDownline(
  accountId: string,
): Promise<FranchiseDownlineAccount[]> {
  return requestFranchiseApi<FranchiseDownlineAccount[]>(
    `/accounts/${encodeURIComponent(accountId)}/network/all`,
  );
}


export async function getFranchiseWalletBalance(
  accountId: string,
): Promise<FranchiseWalletBalance> {
  return requestFranchiseApi<FranchiseWalletBalance>(
    `/wallets/${encodeURIComponent(accountId)}/balance`,
  );
}


export async function getFranchiseCommissions(
  period: FranchiseCommissionPeriod = "month",
  from?: string,
  to?: string,
): Promise<FranchiseCommissionsResponse> {
  const params = new URLSearchParams();
  params.set("period", period);

  if (period === "custom") {
    if (!from || !to) {
      throw new Error("INVALID_COMMISSION_DATE_RANGE");
    }

    params.set("from", from);
    params.set("to", to);
  }

  return requestFranchiseApi<FranchiseCommissionsResponse>(
    `/franchise/commissions?${params.toString()}`,
  );
}


