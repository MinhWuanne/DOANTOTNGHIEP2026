import { API_BASE_URL } from "./api-config";

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}


export interface AdminCategoryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminCategoryListResult {
  data: AdminCategory[];
  pagination: AdminCategoryPagination;
}

export interface CreateAdminCategoryInput {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateAdminCategoryInput {
  name?: string;
  slug?: string;
  description?: string;
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

export async function getAdminCategories(
  accessToken: string,
  params: { page?: number; limit?: number; search?: string } = {},
): Promise<AdminCategoryListResult> {
  const query = new URLSearchParams();

  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }

  if (params.search?.trim()) {
    query.set("search", params.search.trim());
  }

  const queryString = query.toString();
  const url = `${API_BASE_URL}/admin/categories${queryString ? `?${queryString}` : ""
    }`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.error || "GET_ADMIN_CATEGORIES_FAILED",
    );
  }

  return {
    data: result.data,
    pagination: result.pagination,
  };
}

export async function getAdminCategoryById(
  accessToken: string,
  id: string,
): Promise<AdminCategory> {
  const response = await fetch(
    `${API_BASE_URL}/admin/categories/${id}`,
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
        "CATEGORY_DETAIL_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function createAdminCategory(
  accessToken: string,
  input: CreateAdminCategoryInput,
): Promise<AdminCategory> {
  const response = await fetch(
    `${API_BASE_URL}/admin/categories`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "CATEGORY_CREATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function updateAdminCategory(
  accessToken: string,
  id: string,
  input: UpdateAdminCategoryInput,
): Promise<AdminCategory> {
  const response = await fetch(
    `${API_BASE_URL}/admin/categories/${id}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "CATEGORY_UPDATE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return data.data;
}

export async function deleteAdminCategory(
  accessToken: string,
  id: string,
): Promise<{ id: string; deleted: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/admin/categories/${id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "CATEGORY_DELETE_FAILED",
      ),
    );
  }

  const data = await response.json();

  return {
    id: String(data.data.id),
    deleted: data.data.deleted,
  };
}
