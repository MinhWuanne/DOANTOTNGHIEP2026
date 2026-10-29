
import { prisma } from "../../lib/prisma.js";
import { PrismaClient } from "../../generated/prisma/client.js";

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

export interface CreateInventoryInput {
  variantId: bigint | number;
  quantity?: number;
}

export class InventoryService {
  // =====================================================
  // Get Inventory
  // =====================================================

  async getInventoryByVariantId(variantId: bigint | number) {
    const id = BigInt(variantId);

    const variant = await prisma.productVariant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!variant) {
      throw new Error("PRODUCT_VARIANT_NOT_FOUND");
    }

    const inventory = await prisma.inventory.findUnique({
      where: { variantId: id },
    });

    if (!inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    return inventory;
  }

   // =====================================================
  // Get Inventories
  // =====================================================

  async getInventories(productId?: bigint | number) {
    const where =
      productId !== undefined
        ? {
            variant: {
              productId: BigInt(productId),
            },
          }
        : {};

    const inventories = await prisma.inventory.findMany({
      where,
      orderBy: {
        id: "asc",
      },
      include: {
        variant: {
          select: {
            id: true,
            name: true,
            sku: true,
            status: true,
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                status: true,
              },
            },
          },
        },
      },
    });

    return inventories.map((inventory) => ({
      ...inventory,
      availableQty:
        inventory.quantity - inventory.reservedQty,
    }));
  }

  // =====================================================
  // Create Inventory
  // =====================================================

  async createInventory(input: CreateInventoryInput) {
    const variantId = BigInt(input.variantId);
    const quantity = input.quantity ?? 0;

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new Error("INVALID_INVENTORY_QUANTITY");
    }

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true },
    });

    if (!variant) {
      throw new Error("PRODUCT_VARIANT_NOT_FOUND");
    }

    const existingInventory = await prisma.inventory.findUnique({
      where: { variantId },
    });

    if (existingInventory) {
      throw new Error("INVENTORY_ALREADY_EXISTS");
    }

    return prisma.inventory.create({
      data: {
        variantId,
        quantity,
        reservedQty: 0,
      },
    });
  }

  // =====================================================
  // Transaction Helpers
  // =====================================================

  /**
   * Reserve stock for an order.
   *
   * Atomic operation:
   * availableQty = quantity - reservedQty
   *
   * The UPDATE only succeeds when enough available stock exists.
   * This prevents double reservation under concurrent requests.
   */
  async reserveStockInTransaction(
    tx: PrismaTransactionClient,
    variantId: bigint | number,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("INVALID_RESERVE_QUANTITY");
    }

    const id = BigInt(variantId);

    const affectedRows = await tx.$executeRaw`
      UPDATE inventories
      SET reservedQty = reservedQty + ${quantity}
      WHERE variantId = ${id}
        AND quantity - reservedQty >= ${quantity}
    `;

    if (affectedRows !== 1) {
      throw new Error("INSUFFICIENT_AVAILABLE_STOCK");
    }

    return tx.inventory.findUniqueOrThrow({
      where: { variantId: id },
    });
  }

  /**
   * Release previously reserved stock.
   *
   * Used when an order is cancelled before delivery.
   * Does NOT change quantity.
   */
  async releaseStockInTransaction(
    tx: PrismaTransactionClient,
    variantId: bigint | number,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("INVALID_RELEASE_QUANTITY");
    }

    const id = BigInt(variantId);

    const affectedRows = await tx.$executeRaw`
      UPDATE inventories
      SET reservedQty = reservedQty - ${quantity}
      WHERE variantId = ${id}
        AND reservedQty >= ${quantity}
    `;

    if (affectedRows !== 1) {
      throw new Error("RELEASE_EXCEEDS_RESERVED_STOCK");
    }

    return tx.inventory.findUniqueOrThrow({
      where: { variantId: id },
    });
  }

  /**
   * Deduct stock that was previously reserved.
   *
   * Used when an order is actually delivered.
   *
   * quantity      -= ordered quantity
   * reservedQty   -= ordered quantity
   */
  async deductReservedStockInTransaction(
    tx: PrismaTransactionClient,
    variantId: bigint | number,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("INVALID_DEDUCT_RESERVED_QUANTITY");
    }

    const id = BigInt(variantId);

    const affectedRows = await tx.$executeRaw`
      UPDATE inventories
      SET quantity = quantity - ${quantity},
          reservedQty = reservedQty - ${quantity}
      WHERE variantId = ${id}
        AND reservedQty >= ${quantity}
        AND quantity >= ${quantity}
    `;

    if (affectedRows !== 1) {
      throw new Error(
        "DEDUCT_RESERVED_EXCEEDS_RESERVED_STOCK",
      );
    }

    return tx.inventory.findUniqueOrThrow({
      where: { variantId: id },
    });
  }

  /**
   * Restore inventory after a successful return/refund.
   *
   * IMPORTANT:
   * - quantity is increased
   * - reservedQty is NOT changed
   *
   * At this point the original order has already reached DELIVERED,
   * so its reserved stock was already deducted.
   */
  async restoreReturnedStockInTransaction(
    tx: PrismaTransactionClient,
    variantId: bigint | number,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("INVALID_RESTORE_QUANTITY");
    }

    const id = BigInt(variantId);

    const affectedRows = await tx.$executeRaw`
      UPDATE inventories
      SET quantity = quantity + ${quantity}
      WHERE variantId = ${id}
    `;

    if (affectedRows !== 1) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    return tx.inventory.findUniqueOrThrow({
      where: { variantId: id },
    });
  }

  // =====================================================
  // Public reserveStock
  // =====================================================

  async reserveStock(
    variantId: bigint | number,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("INVALID_RESERVE_QUANTITY");
    }

    const id = BigInt(variantId);

    const variant = await prisma.productVariant.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!variant) {
      throw new Error("PRODUCT_VARIANT_NOT_FOUND");
    }

    const inventory = await prisma.inventory.findUnique({
      where: { variantId: id },
    });

    if (!inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    const availableQty =
      inventory.quantity - inventory.reservedQty;

    if (quantity > availableQty) {
      throw new Error("INSUFFICIENT_AVAILABLE_STOCK");
    }

    return prisma.$transaction(async (tx) => {
      return this.reserveStockInTransaction(
        tx,
        id,
        quantity,
      );
    });
  }

  // =====================================================
  // Public releaseStock
  // =====================================================

  async releaseStock(
    variantId: bigint | number,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("INVALID_RELEASE_QUANTITY");
    }

    const id = BigInt(variantId);

    const inventory = await prisma.inventory.findUnique({
      where: { variantId: id },
    });

    if (!inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    if (quantity > inventory.reservedQty) {
      throw new Error("RELEASE_EXCEEDS_RESERVED_STOCK");
    }

    return prisma.$transaction(async (tx) => {
      return this.releaseStockInTransaction(
        tx,
        id,
        quantity,
      );
    });
  }

  // =====================================================
  // Public deductReservedStock
  // =====================================================

  async deductReservedStock(
    variantId: bigint | number,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("INVALID_DEDUCT_RESERVED_QUANTITY");
    }

    const id = BigInt(variantId);

    const inventory = await prisma.inventory.findUnique({
      where: { variantId: id },
    });

    if (!inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    if (quantity > inventory.reservedQty) {
      throw new Error(
        "DEDUCT_RESERVED_EXCEEDS_RESERVED_STOCK",
      );
    }

    return prisma.$transaction(async (tx) => {
      return this.deductReservedStockInTransaction(
        tx,
        id,
        quantity,
      );
    });
  }

  // =====================================================
  // Public restoreReturnedStock
  // =====================================================

  /**
   * Restore inventory after an order has been returned.
   *
   * This is intentionally different from releaseStock():
   *
   * releaseStock()
   *   -> reservedQty decreases
   *   -> quantity unchanged
   *
   * restoreReturnedStock()
   *   -> quantity increases
   *   -> reservedQty unchanged
   */
  async restoreReturnedStock(
    variantId: bigint | number,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("INVALID_RESTORE_QUANTITY");
    }

    const id = BigInt(variantId);

    const inventory = await prisma.inventory.findUnique({
      where: { variantId: id },
    });

    if (!inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    return prisma.$transaction(async (tx) => {
      return this.restoreReturnedStockInTransaction(
        tx,
        id,
        quantity,
      );
    });
  }

  // =====================================================
  // Existing deductStock
  // =====================================================

  async deductStock(
    variantId: bigint | number,
    quantity: number,
  ) {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("INVALID_DEDUCT_QUANTITY");
    }

    const id = BigInt(variantId);

    const inventory = await prisma.inventory.findUnique({
      where: { variantId: id },
    });

    if (!inventory) {
      throw new Error("INVENTORY_NOT_FOUND");
    }

    const availableQty =
      inventory.quantity - inventory.reservedQty;

    if (quantity > availableQty) {
      throw new Error("INSUFFICIENT_AVAILABLE_STOCK");
    }

    return prisma.$transaction(async (tx) => {
      const affectedRows = await tx.$executeRaw`
        UPDATE inventories
        SET quantity = quantity - ${quantity}
        WHERE variantId = ${id}
          AND quantity - reservedQty >= ${quantity}
      `;

      if (affectedRows !== 1) {
        throw new Error(
          "INSUFFICIENT_AVAILABLE_STOCK",
        );
      }

      return tx.inventory.findUniqueOrThrow({
        where: { variantId: id },
      });
    });
  }
}

export const inventoryService =
  new InventoryService();

