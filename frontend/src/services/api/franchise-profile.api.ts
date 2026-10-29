
import { API_BASE_URL } from "./api-config";

import { getAccessToken } from "../../utils/auth";

export interface FranchisePersonalProfile {
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
    franchiseProfile: {
      id: string;
      franchiseCode: string;
      status: string;
      joinedAt: string;
    } | null;
  }[];
}

async function getFranchisePersonId(
  accessToken: string,
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "AUTH_ME_FAILED");
  }

  const personId = data.data?.personId;

  if (!personId) {
    throw new Error("PERSON_ID_NOT_FOUND");
  }

  return personId;
}

export async function getFranchiseProfile(): Promise<FranchisePersonalProfile> {
  const accessToken = getAccessToken("FRANCHISE");

  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const personId = await getFranchisePersonId(accessToken);

  const response = await fetch(
    `${API_BASE_URL}/persons/${personId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "PROFILE_LOAD_FAILED");
  }

  return data.data as FranchisePersonalProfile;
}

export async function updateFranchiseFullName(
  fullName: string,
): Promise<FranchisePersonalProfile> {
  const accessToken = getAccessToken("FRANCHISE");

  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const profile = await getFranchiseProfile();

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

  return data.data as FranchisePersonalProfile;
}

