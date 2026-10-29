
import { API_BASE_URL } from "./api-config";

export type AdminRole =
  | "ADMIN"
  | "SUPER_ADMIN";

export type AdminStatus =
  | "ACTIVE"
  | "DISABLED";

export interface AdminAccount {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
  status: AdminStatus;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCreatedBy {
  id: string;
  username: string;
  email: string;
  role: AdminRole;
}

export interface AdminAccountDetail
  extends AdminAccount {
  createdBy: AdminCreatedBy | null;
}

export interface CreateAdminInput {
  username: string;
  email: string;
  password: string;
}

export interface UpdateAdminInput {
  username?: string;
  email?: string;
  password?: string;
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

export async function getAdminAccounts(
  accessToken: string,
): Promise<AdminAccount[]> {
  const response = await fetch(
    `${API_BASE_URL}/admins`,
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
        "ADMIN_LIST_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function getAdminAccountById(
  accessToken: string,
  id: string,
): Promise<AdminAccountDetail> {
  const response = await fetch(
    `${API_BASE_URL}/admins/${id}`,
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
        "ADMIN_DETAIL_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function createAdminAccount(
  accessToken: string,
  input: CreateAdminInput,
): Promise<AdminAccount> {
  const response = await fetch(
    `${API_BASE_URL}/admins`,
    {
      method: "POST",
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
        "ADMIN_CREATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function updateAdminAccount(
  accessToken: string,
  id: string,
  input: UpdateAdminInput,
): Promise<AdminAccount> {
  const response = await fetch(
    `${API_BASE_URL}/admins/${id}`,
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
        "ADMIN_UPDATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function disableAdminAccount(
  accessToken: string,
  id: string,
): Promise<AdminAccount> {
  const response = await fetch(
    `${API_BASE_URL}/admins/${id}/disable`,
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
        "ADMIN_DISABLE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function enableAdminAccount(
  accessToken: string,
  id: string,
): Promise<AdminAccount> {
  const response = await fetch(
    `${API_BASE_URL}/admins/${id}/enable`,
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
        "ADMIN_ENABLE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}


