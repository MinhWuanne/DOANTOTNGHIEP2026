import { API_BASE_URL } from "./api-config";

export interface AdminLoginInput {
  username?: string;
  email?: string;
  password: string;
}

export async function loginAdmin(input: AdminLoginInput) {
  const response = await fetch(`${API_BASE_URL}/admin/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "ADMIN_LOGIN_FAILED");
  }

  return data.data;
}
