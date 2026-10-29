import {
  inventoryService,
} from "../../services/inventory/inventory.service.js";

import { parsePositiveId } from "../../utils/parse-positive-id.js";

export interface CreateInventoryRequest {
  variantId: string | number;
  quantity?: number;
}

export interface GetInventoriesQuery {
  productId?: string;
}

export class InventoryController {

  async getInventories(
    productId?: string,
  ) {
    const parsedProductId =
      productId !== undefined
        ? parsePositiveId(productId)
        : undefined;

    return inventoryService.getInventories(
      parsedProductId,
    );
  }

  async getInventoryByVariantId(
    variantId: string | number,
  ) {
    return inventoryService.getInventoryByVariantId(
      parsePositiveId(String(variantId)),
    );
  }

  async createInventory(
    input: CreateInventoryRequest,
  ) {
    return inventoryService.createInventory({
      variantId: parsePositiveId(
        String(input.variantId),
      ),
      quantity: input.quantity ?? 0,
    });
  }
}

export const inventoryController =
  new InventoryController();