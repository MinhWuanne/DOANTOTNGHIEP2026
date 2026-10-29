import { API_BASE_URL } from "./api-config";

export type MemberStatus =
  | "ACTIVE"
  | "LOCKED"
  | "INACTIVE";

export type ReferralSourceType =
  | "NONE"
  | "MEMBER"
  | "FRANCHISE";

export interface MemberPerson {
  id: string;
  fullName: string;
}

export interface MemberProfile {
  id: string;
  referralCode: string;
}

export interface MemberReferrerPerson {
  id: string;
  fullName: string;
}

export interface MemberReferrerMemberProfile {
  referralCode: string;
}

export interface MemberReferrerFranchiseProfile {
  franchiseCode: string;
}

export interface MemberReferrer {
  id: string;
  platform: "MEMBER" | "FRANCHISE";
  email: string | null;
  phone: string | null;
  status: MemberStatus;
  person: MemberReferrerPerson;
  memberProfile: MemberReferrerMemberProfile | null;
  franchiseProfile: MemberReferrerFranchiseProfile | null;
}

export interface MemberReferralReceived {
  id: string;
  sourceAccountId: string | null;
  sourceType: ReferralSourceType;
  createdAt: string;
  sourceAccount: MemberReferrer | null;
}

export interface AdminMember {
  id: string;
  personId: string;
  platform: "MEMBER";
  email: string;
  phone: string;
  status: MemberStatus;
  createdAt: string;
  updatedAt: string;
  person: MemberPerson;
  memberProfile: MemberProfile | null;
  referralReceived: MemberReferralReceived | null;
}

export interface AdminMemberReferralTreeMember {
  id: string;
  fullName: string;
  referralCode: string | null;
  email: string | null;
  phone: string | null;
  status: MemberStatus;
  createdAt: string;
  referredAt: string;
}

export interface AdminMemberReferralTree {
  memberId: string;
  directCount: number;
  totalDescendantCount: number;
  directMembers: AdminMemberReferralTreeMember[];
}

export interface UpdateAdminMemberInput {
  fullName?: string;
  email?: string;
  phone?: string;
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

export async function getAdminMembers(
  accessToken: string,
): Promise<AdminMember[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/members`,
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
        "MEMBER_LIST_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminMemberById(
  accessToken: string,
  id: string,
): Promise<AdminMember> {
  const response = await fetch(
    `${API_BASE_URL}/admin/members/${id}`,
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
        "MEMBER_DETAIL_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function updateAdminMember(
  accessToken: string,
  id: string,
  input: UpdateAdminMemberInput,
): Promise<AdminMember> {
  const response = await fetch(
    `${API_BASE_URL}/admin/members/${id}`,
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
        "MEMBER_UPDATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function lockAdminMember(
  accessToken: string,
  id: string,
): Promise<AdminMember> {
  const response = await fetch(
    `${API_BASE_URL}/admin/members/${id}/lock`,
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
        "MEMBER_LOCK_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function unlockAdminMember(
  accessToken: string,
  id: string,
): Promise<AdminMember> {
  const response = await fetch(
    `${API_BASE_URL}/admin/members/${id}/unlock`,
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
        "MEMBER_UNLOCK_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}


export async function getAdminMemberReferralTree(
  accessToken: string,
  id: string,
): Promise<AdminMemberReferralTree> {
  const response = await fetch(
    `${API_BASE_URL}/admin/members/${id}/referral-tree`,
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
        "GET_MEMBER_REFERRAL_TREE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}
