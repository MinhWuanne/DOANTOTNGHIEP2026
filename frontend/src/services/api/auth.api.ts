import { API_BASE_URL } from "./api-config";

export interface LoginInput {
  email?: string;
  phone?: string;
  password: string;
}

export interface RegisterInput {
  fullName: string;
  email?: string;
  phone?: string;
  password: string;
  inviteCode?: string;
}

export async function loginMember(input: LoginInput) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "LOGIN_FAILED");
  }

  return data.data;
}

export async function loginFranchise(input: LoginInput) {
  const response = await fetch(`${API_BASE_URL}/auth/franchise/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "LOGIN_FAILED");
  }

  return data.data;
}

export async function registerMember(input: RegisterInput) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "REGISTER_FAILED");
  }

  return data.data;
}

export async function getCurrentAuth(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "AUTH_ME_FAILED");
  }

  return data.data;
}

import { getAccessToken } from "../../utils/auth";

export interface MemberProfile {
  id: string;
  fullName: string;
  accounts: {
    id: string;
    personId: string;
    platform: string;
    email: string | null;
    phone: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
    memberProfile: {
      referralCode: string;
    } | null;
  }[];
}

export async function getMemberProfile(): Promise<MemberProfile> {
  const accessToken = getAccessToken("MEMBER");
  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const authResponse = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const authData = await authResponse.json();

  if (!authResponse.ok) {
    throw new Error(authData.error ?? "AUTH_ME_FAILED");
  }

  const personId = authData.data?.personId;

  if (!personId) {
    throw new Error("PERSON_ID_NOT_FOUND");
  }

  const profileResponse = await fetch(
    `${API_BASE_URL}/persons/${personId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const profileData = await profileResponse.json();

  if (!profileResponse.ok) {
    throw new Error(profileData.error ?? "PROFILE_LOAD_FAILED");
  }

  return profileData.data as MemberProfile;
}

export async function updateMemberFullName(fullName: string) {
  const accessToken = getAccessToken("MEMBER");

  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const profile = await getMemberProfile();

  const response = await fetch(
    `${API_BASE_URL}/persons/${profile.id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ fullName }),
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "PROFILE_UPDATE_FAILED");
  }

  return data.data as MemberProfile;
}


