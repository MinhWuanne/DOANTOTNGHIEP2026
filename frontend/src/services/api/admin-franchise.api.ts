
import { API_BASE_URL } from "./api-config";

export type FranchiseAccountStatus =
  | "ACTIVE"
  | "LOCKED"
  | "INACTIVE";

export type FranchiseStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "LOCKED"
  | "TERMINATED";

export type AdminFranchiseStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "LOCKED";

export type FranchiseAnalyticsGroupBy =
  | "hour"
  | "day";

export type FranchiseRankingSortBy =
  | "revenue"
  | "orders"
  | "commission"
  | "network";

export interface FranchisePerson {
  id: string;
  fullName: string;
}

export interface FranchiseProfile {
  id: string;
  accountId: string;
  franchiseCode: string;
  status: FranchiseStatus;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFranchise {
  id: string;
  personId: string;
  platform: "FRANCHISE";
  email: string;
  phone: string;
  status: FranchiseAccountStatus;
  createdAt: string;
  updatedAt: string;
  person: FranchisePerson;
  franchiseProfile: FranchiseProfile | null;
}

export interface UpdateAdminFranchiseInput {
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface AdminFranchiseOverview {
  totalFranchises: number;
  activeFranchises: number;
  monthlyOrders: number;
  monthlyRevenue: number;
  monthlyPaidCommission: number;
}

export interface AdminFranchiseNetworkRoot {
  id: string;
  personId: string;
  fullName: string;
  email: string;
  phone: string | null;
  platform: "FRANCHISE";
  accountStatus: FranchiseAccountStatus;
  franchiseStatus: FranchiseStatus | null;
  franchiseCode: string | null;
  joinedAt: string | null;
}

export interface AdminFranchiseNetworkNode {
  id: string;
  parentAccountId: string;
  personId: string;
  fullName: string;
  email: string;
  phone: string | null;
  platform: "MEMBER" | "FRANCHISE";
  accountStatus: FranchiseAccountStatus;
  franchiseStatus: FranchiseStatus | null;
  franchiseCode: string | null;
  level: number;
}

export interface AdminFranchiseNetwork {
  root: AdminFranchiseNetworkRoot;
  stats: {
    directDownline: number;
    otherDownline: number;
    totalDownline: number;
  };
  nodes: AdminFranchiseNetworkNode[];
}

export interface AdminFranchiseAnalyticsFilter {
  franchiseId?: string;
  from?: string;
  to?: string;
  groupBy: FranchiseAnalyticsGroupBy;
}

export interface AdminFranchiseAnalyticsSummary {
  orders: number;
  revenue: number;
  paidCommission: number;
}

export interface AdminFranchiseAnalyticsTimelineItem {
  date: string;
  orders: number;
  revenue: number;
  paidCommission: number;
}

export interface AdminFranchiseAnalytics {
  filter: AdminFranchiseAnalyticsFilter;
  summary: AdminFranchiseAnalyticsSummary;
  timeline: AdminFranchiseAnalyticsTimelineItem[];
}

export interface AdminFranchiseRankingItem {
  rank: number;
  franchiseId: string;
  franchiseCode: string;
  fullName: string;
  orders: number;
  revenue: number;
  paidCommission: number;
  totalDownline: number;
}

export interface AdminFranchiseRanking {
  sortBy: FranchiseRankingSortBy;
  from?: string;
  to?: string;
  items: AdminFranchiseRankingItem[];
  total: number;
  hasMore: boolean;
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

export async function getAdminFranchises(
  accessToken: string,
): Promise<AdminFranchise[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/franchises`,
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
        "FRANCHISE_LIST_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminFranchiseById(
  accessToken: string,
  id: string,
): Promise<AdminFranchise> {
  const response = await fetch(
    `${API_BASE_URL}/admin/franchises/${id}`,
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
        "FRANCHISE_DETAIL_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function updateAdminFranchise(
  accessToken: string,
  id: string,
  input: UpdateAdminFranchiseInput,
): Promise<AdminFranchise> {
  const response = await fetch(
    `${API_BASE_URL}/admin/franchises/${id}`,
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
        "FRANCHISE_UPDATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function updateAdminFranchiseStatus(
  accessToken: string,
  id: string,
  status: AdminFranchiseStatus,
): Promise<AdminFranchise> {
  const response = await fetch(
    `${API_BASE_URL}/admin/franchises/${id}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        status,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "FRANCHISE_STATUS_UPDATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function lockAdminFranchise(
  accessToken: string,
  id: string,
): Promise<AdminFranchise> {
  const response = await fetch(
    `${API_BASE_URL}/admin/franchises/${id}/lock`,
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
        "FRANCHISE_LOCK_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function unlockAdminFranchise(
  accessToken: string,
  id: string,
): Promise<AdminFranchise> {
  const response = await fetch(
    `${API_BASE_URL}/admin/franchises/${id}/unlock`,
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
        "FRANCHISE_UNLOCK_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminFranchiseOverview(
  accessToken: string,
): Promise<AdminFranchiseOverview> {
  const response = await fetch(
    `${API_BASE_URL}/admin/franchises/overview`,
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
        "FRANCHISE_OVERVIEW_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminFranchiseNetwork(
  accessToken: string,
  id: string,
): Promise<AdminFranchiseNetwork> {
  const response = await fetch(
    `${API_BASE_URL}/admin/franchises/${id}/network`,
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
        "FRANCHISE_NETWORK_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminFranchiseAnalytics(
  accessToken: string,
  input?: {
    franchiseId?: string;
    from?: string;
    to?: string;
    groupBy?: FranchiseAnalyticsGroupBy;
  },
): Promise<AdminFranchiseAnalytics> {
  const params = new URLSearchParams();

  if (input?.franchiseId) {
    params.set(
      "franchiseId",
      input.franchiseId,
    );
  }

  if (input?.from) {
    params.set("from", input.from);
  }

  if (input?.to) {
    params.set("to", input.to);
  }

  if (input?.groupBy) {
    params.set(
      "groupBy",
      input.groupBy,
    );
  }

  const queryString = params.toString();

  const response = await fetch(
    `${API_BASE_URL}/admin/franchises/analytics${
      queryString
        ? `?${queryString}`
        : ""
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
        "FRANCHISE_ANALYTICS_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminFranchiseRanking(
  accessToken: string,
  input?: {
    sortBy?: FranchiseRankingSortBy;
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
  },
): Promise<AdminFranchiseRanking> {
  const params = new URLSearchParams();

  if (input?.sortBy) {
    params.set(
      "sortBy",
      input.sortBy,
    );
  }

  if (input?.from) {
    params.set("from", input.from);
  }

  if (input?.to) {
    params.set("to", input.to);
  }

  if (input?.limit !== undefined) {
    params.set(
      "limit",
      String(input.limit),
    );
  }

  if (input?.offset !== undefined) {
    params.set(
      "offset",
      String(input.offset),
    );
  }

  const queryString = params.toString();

  const response = await fetch(
    `${API_BASE_URL}/admin/franchises/ranking${
      queryString
        ? `?${queryString}`
        : ""
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
        "FRANCHISE_RANKING_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}


