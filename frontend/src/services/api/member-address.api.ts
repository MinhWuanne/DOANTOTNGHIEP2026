import { getAccessToken } from "../../utils/auth";

import { API_BASE_URL } from "./api-config";

export type AddressType = "HOME" | "OFFICE" | "OTHER";

export interface MemberAddress {
  id: string | number;
  personId: string | number;
  type: AddressType;
  receiverName: string;
  phone: string;
  addressLine: string;
  ward: string | null;
  district: string | null;
  province: string;
  isDefault: boolean;
}

export interface CreateMemberAddressInput {
  type?: AddressType;
  receiverName: string;
  phone: string;
  addressLine: string;
  ward?: string;
  district?: string;
  province: string;
  isDefault?: boolean;
}

export interface UpdateMemberAddressInput {
  type?: AddressType;
  receiverName?: string;
  phone?: string;
  addressLine?: string;
  ward?: string | null;
  district?: string | null;
  province?: string;
  isDefault?: boolean;
}

async function requestMemberAddress<T>(
  accountId: string,
  path = "",
  options: RequestInit = {},
): Promise<T> {
  const accessToken = getAccessToken("MEMBER");
  if (!accessToken) {
    throw new Error("AUTHORIZATION_REQUIRED");
  }

  const response = await fetch(
    `${API_BASE_URL}/accounts/${encodeURIComponent(accountId)}/addresses${path}`,
    {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        Authorization: `Bearer ${accessToken}`,
        ...options.headers,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "ADDRESS_REQUEST_FAILED");
  }

  return data.data as T;
}

export function getMemberAddresses(accountId: string) {
  return requestMemberAddress<MemberAddress[]>(accountId);
}

export function createMemberAddress(
  accountId: string,
  input: CreateMemberAddressInput,
) {
  return requestMemberAddress<MemberAddress>(accountId, "", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateMemberAddress(
  accountId: string,
  addressId: string | number,
  input: UpdateMemberAddressInput,
) {
  return requestMemberAddress<MemberAddress>(
    accountId,
    `/${encodeURIComponent(String(addressId))}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deleteMemberAddress(
  accountId: string,
  addressId: string | number,
) {
  return requestMemberAddress<{ success: boolean; addressId: string | number }>(
    accountId,
    `/${encodeURIComponent(String(addressId))}`,
    {
      method: "DELETE",
    },
  );
}
