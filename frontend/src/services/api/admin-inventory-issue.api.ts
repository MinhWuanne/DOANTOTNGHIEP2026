import { API_BASE_URL } from "./api-config";

export type InventoryIssueStatus =
    | "COMPLETED";

export interface AdminInventoryIssueAccount {
    id: string;
    person: {
        fullName: string;
    };
}

export interface AdminInventoryIssueOrder {
    id: string;
    orderNumber: string;
    status: string;
    deliveredAt: string | null;
    account: AdminInventoryIssueAccount;
}

export interface AdminInventoryIssueItem {
    id: string;
    variantId: string;
    productName: string;
    sku: string;
    quantity: number;
}

export interface AdminInventoryIssue {
    id: string;
    issueNumber: string;
    orderId: string;
    status: InventoryIssueStatus;
    createdAt: string;
    order: AdminInventoryIssueOrder;
    items: AdminInventoryIssueItem[];
}

export interface AdminInventoryIssueSummary {
    total: number;
    today: number;
    totalItems: number;
    totalQuantity: number;
}

export interface AdminInventoryIssueListResult {
    items: AdminInventoryIssue[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    summary: AdminInventoryIssueSummary;
}

async function parseResponse<T>(
    response: Response,
): Promise<T> {
    const body = await response.json();

    if (!response.ok) {
        const message =
            body &&
            typeof body.error === "string"
                ? body.error
                : "Không thể thực hiện yêu cầu.";

        throw new Error(message);
    }

    if (
        body &&
        body.success === false
    ) {
        throw new Error(
            typeof body.error === "string"
                ? body.error
                : "Không thể thực hiện yêu cầu.",
        );
    }

    return body.data as T;
}

export async function getAdminInventoryIssues(
    accessToken: string,
    params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: "COMPLETED";
    } = {},
): Promise<AdminInventoryIssueListResult> {
    const query = new URLSearchParams({
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 10),
    });

    if (params.search?.trim()) {
        query.set("search", params.search.trim());
    }

    if (params.status) {
        query.set("status", params.status);
    }

    const response = await fetch(
        `${API_BASE_URL}/inventory-issues?${query.toString()}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    return parseResponse<AdminInventoryIssueListResult>(
        response,
    );
}

export async function getAdminInventoryIssueById(
    accessToken: string,
    issueId: string,
): Promise<AdminInventoryIssue> {
    const response = await fetch(
        `${API_BASE_URL}/inventory-issues/${issueId}`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    const data =
        await parseResponse<
            AdminInventoryIssue | null
        >(response);

    if (!data) {
        throw new Error(
            "Không tìm thấy phiếu xuất.",
        );
    }

    return data;
}
