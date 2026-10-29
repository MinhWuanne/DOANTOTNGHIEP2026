
import {
    InventoryReceiptStatus,
} from "../../generated/prisma/client.js";

import {
    inventoryReceiptService,
} from "../../services/inventory/inventory-receipt.service.js";

import {
    parsePositiveId,
} from "../../utils/parse-positive-id.js";

export interface CreateInventoryReceiptRequest {
    note?: string;

    items: Array<{
        variantId: string | number;
        quantity: number;
    }>;
}

export interface GetInventoryReceiptsRequest {
    page?: number;
    limit?: number;
    search?: string;
    status?: InventoryReceiptStatus | "ALL";
}

export class InventoryReceiptController {
    // =====================================================
    // Get Receipts
    // =====================================================

    async getReceipts(
        query: GetInventoryReceiptsRequest = {},
    ) {
        return inventoryReceiptService.getReceipts(query);
    }

    // =====================================================
    // Get Receipt By ID
    // =====================================================

    async getReceiptById(
        receiptId: string | number,
    ) {
        return inventoryReceiptService.getReceiptById(
            parsePositiveId(String(receiptId)),
        );
    }

    // =====================================================
    // Create Receipt
    // =====================================================

    async createReceipt(
        adminId: string | number,
        input: CreateInventoryReceiptRequest,
    ) {
        return inventoryReceiptService.createReceipt({
            createdById: parsePositiveId(
                String(adminId),
            ),
            note: input.note,
            items: input.items.map((item) => ({
                variantId: parsePositiveId(
                    String(item.variantId),
                ),
                quantity: item.quantity,
            })),
        });
    }

    // =====================================================
    // Confirm Receipt
    // =====================================================

    async confirmReceipt(
        receiptId: string | number,
    ) {
        return inventoryReceiptService.confirmReceipt(
            parsePositiveId(String(receiptId)),
        );
    }

    // =====================================================
    // Cancel Receipt
    // =====================================================

    async cancelReceipt(
        receiptId: string | number,
    ) {
        return inventoryReceiptService.cancelReceipt(
            parsePositiveId(String(receiptId)),
        );
    }
}

export const inventoryReceiptController =
    new InventoryReceiptController();