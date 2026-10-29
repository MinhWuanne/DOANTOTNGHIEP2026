
import { API_BASE_URL } from "./api-config";

export type InventoryReceiptStatus =
    | "DRAFT"
    | "CONFIRMED"
    | "CANCELLED";

export interface AdminInventoryReceiptVariant {
    id: string;
    name: string | null;
    sku: string;
    status: "ACTIVE" | "INACTIVE";
    product: {
        id: string;
        name: string;
        slug: string;
        status: "ACTIVE" | "INACTIVE";
    };
}

export interface AdminInventoryReceiptItem {
    id: string;
    variantId: string;
    quantity: number;
    variant: AdminInventoryReceiptVariant;
}

export interface AdminInventoryReceiptCreatedBy {
    id: string;
    username: string;
    role: "ADMIN" | "SUPER_ADMIN";
}

export interface AdminInventoryReceipt {
    id: string;
    receiptNumber: string;
    status: InventoryReceiptStatus;
    note: string | null;
    createdAt: string;
    confirmedAt: string | null;
    createdBy: AdminInventoryReceiptCreatedBy;
    items: AdminInventoryReceiptItem[];
}

export interface CreateInventoryReceiptItemInput {
    variantId: string;
    quantity: number;
}

export interface CreateInventoryReceiptInput {
    note?: string;
    items: CreateInventoryReceiptItemInput[];
}

export interface AdminInventoryReceiptPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface AdminInventoryReceiptSummary {
    total: number;
    draft: number;
    confirmed: number;
    cancelled: number;
}

export interface GetAdminInventoryReceiptsParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: InventoryReceiptStatus | "ALL";
}

export interface AdminInventoryReceiptListResult {
    items: AdminInventoryReceipt[];
    pagination: AdminInventoryReceiptPagination;
    summary: AdminInventoryReceiptSummary;
}

async function getErrorMessage(
    response: Response,
    fallback: string,
): Promise<string> {
    try {
        const data = await response.json();

        if (
            data &&
            typeof data.error === "string"
        ) {
            return data.error;
        }
    } catch {
        // Ignore invalid JSON error response.
    }

    return fallback;
}

// =====================================================
// Get Receipts
// =====================================================

export async function getAdminInventoryReceipts(
    accessToken: string,
    params: GetAdminInventoryReceiptsParams = {},
): Promise<AdminInventoryReceiptListResult> {
    const searchParams = new URLSearchParams();

    if (params.page !== undefined) {
        searchParams.set("page", String(params.page));
    }

    if (params.limit !== undefined) {
        searchParams.set("limit", String(params.limit));
    }

    if (params.search?.trim()) {
        searchParams.set("search", params.search.trim());
    }

    if (params.status && params.status !== "ALL") {
        searchParams.set("status", params.status);
    }

    const queryString = searchParams.toString();

    const url = queryString
        ? `${API_BASE_URL}/inventory-receipts?${queryString}`
        : `${API_BASE_URL}/inventory-receipts`;

    const response = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                "INVENTORY_RECEIPT_LIST_FAILED",
            ),
        );
    }

    const data = await response.json();

    return data.data;
}

// =====================================================
// Get Receipt By ID
// =====================================================

export async function getAdminInventoryReceiptById(
    accessToken: string,
    id: string,
): Promise<AdminInventoryReceipt> {
    const response = await fetch(
        `${API_BASE_URL}/inventory-receipts/${id}`,
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
                "INVENTORY_RECEIPT_DETAIL_FAILED",
            ),
        );
    }

    const data = await response.json();

    return data.data;
}

// =====================================================
// Create Receipt
// =====================================================

export async function createAdminInventoryReceipt(
    accessToken: string,
    input: CreateInventoryReceiptInput,
): Promise<AdminInventoryReceipt> {
    const response = await fetch(
        `${API_BASE_URL}/inventory-receipts`,
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
                "INVENTORY_RECEIPT_CREATE_FAILED",
            ),
        );
    }

    const data = await response.json();

    return data.data;
}

// =====================================================
// Confirm Receipt
// =====================================================

export async function confirmAdminInventoryReceipt(
    accessToken: string,
    id: string,
): Promise<AdminInventoryReceipt> {
    const response = await fetch(
        `${API_BASE_URL}/inventory-receipts/${id}/confirm`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                "INVENTORY_RECEIPT_CONFIRM_FAILED",
            ),
        );
    }

    const data = await response.json();

    return data.data;
}

// =====================================================
// Cancel Receipt
// =====================================================

export async function cancelAdminInventoryReceipt(
    accessToken: string,
    id: string,
): Promise<AdminInventoryReceipt> {
    const response = await fetch(
        `${API_BASE_URL}/inventory-receipts/${id}/cancel`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    if (!response.ok) {
        throw new Error(
            await getErrorMessage(
                response,
                "INVENTORY_RECEIPT_CANCEL_FAILED",
            ),
        );
    }

    const data = await response.json();

    return data.data;
}
