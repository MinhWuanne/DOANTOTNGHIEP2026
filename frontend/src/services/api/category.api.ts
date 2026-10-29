import { API_BASE_URL } from "./api-config";

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
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

export async function getCategories(): Promise<ProductCategory[]> {
  const response = await fetch(
    `${API_BASE_URL}/categories`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "CATEGORY_LIST_FAILED",
      ),
    );
  }

  const result = await response.json();

  return result.data;
}
