
import { prisma } from "../../lib/prisma.js";
import { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import {
  AccountPlatform,
  OrderStatus,
  PaymentInstructionStatus,
  PaymentInstructionType,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  UserStatus,
} from "../../generated/prisma/enums.js";
import { inventoryService } from "../inventory/inventory.service.js";
import { inventoryIssueService } from "../inventory/inventory-issue.service.js";

import { CommissionSourceType } from "../../generated/prisma/enums.js";
import { commissionService } from "../commission/commission.service.js";
import { demoClockService } from "../demo-clock/demo-clock.service.js";

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

const MAX_ORDER_ITEM_QUANTITY = 99;
const DEFAULT_SHIPPING_FEE = new Prisma.Decimal(30000);
const DEFAULT_DISCOUNT_RATE = new Prisma.Decimal("0.10");

export interface CreateOrderItemInput {
  variantId: bigint | number;
  quantity: number;
}

export interface CreateOrderInput {
  accountId: bigint | number;
  platform: AccountPlatform;
  addressId: bigint | number;
  items: CreateOrderItemInput[];

  // Giữ lại để tương thích với code hiện tại.
  // Service KHÔNG sử dụng các giá trị này.
  shippingFee?: Prisma.Decimal | number | string;
  discount?: Prisma.Decimal | number | string;

  paymentMethod?: PaymentMethod;
}

export class OrderService {
  async createOrder(input: CreateOrderInput) {
    // =====================================================
    // 1. Validate order items
    // =====================================================

    if (input.items.length === 0) {
      throw new Error("ORDER_ITEMS_REQUIRED");
    }

    for (const item of input.items) {
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0 ||
        item.quantity > MAX_ORDER_ITEM_QUANTITY
      ) {
        throw new Error("INVALID_ITEM_QUANTITY");
      }
    }

    const accountId = BigInt(input.accountId);

    // =====================================================
    // 2. Validate account
    // =====================================================

    const account = await prisma.userAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        personId: true,
        platform: true,
        status: true,
      },
    });

    if (!account) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    if (account.platform !== input.platform) {
      throw new Error("ACCOUNT_PLATFORM_MISMATCH");
    }

    // Order/Checkout chỉ dành cho MEMBER
    if (account.platform !== AccountPlatform.MEMBER) {
      throw new Error("MEMBER_ACCOUNT_REQUIRED");
    }

    // Account phải đang hoạt động
    if (account.status !== UserStatus.ACTIVE) {
      throw new Error("ACCOUNT_NOT_ACTIVE");
    }

    // =====================================================
    // 3. Validate address
    // =====================================================

    if (
      input.addressId === undefined ||
      input.addressId === null
    ) {
      throw new Error("ADDRESS_REQUIRED");
    }

    const addressId = BigInt(input.addressId);

    const address = await prisma.address.findUnique({
      where: { id: addressId },
      select: {
        id: true,
        personId: true,
      },
    });

    if (!address) {
      throw new Error("ADDRESS_NOT_FOUND");
    }

    if (address.personId !== account.personId) {
      throw new Error(
        "ADDRESS_NOT_BELONG_TO_ACCOUNT_PERSON",
      );
    }

    // =====================================================
    // 4. Validate duplicate variants
    // =====================================================

    const variantIds = input.items.map(
      (item) => BigInt(item.variantId),
    );

    const uniqueVariantIds = new Set(
      variantIds.map((id) => id.toString()),
    );

    if (
      uniqueVariantIds.size !==
      variantIds.length
    ) {
      throw new Error(
        "DUPLICATE_VARIANT_IN_ORDER",
      );
    }

    // =====================================================
    // 5. Load variants
    // =====================================================

    const variants =
      await prisma.productVariant.findMany({
        where: {
          id: {
            in: variantIds,
          },
        },
      });

    if (
      variants.length !== input.items.length
    ) {
      throw new Error(
        "PRODUCT_VARIANT_NOT_FOUND",
      );
    }

    // =====================================================
    // 6. Load products
    // =====================================================

    const productIds = [
      ...new Set(
        variants.map((variant) =>
          variant.productId.toString(),
        ),
      ),
    ].map((id) => BigInt(id));

    const products =
      await prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },
        select: {
          id: true,
          name: true,
          status: true,
        },
      });

    const productMap = new Map(
      products.map((product) => [
        product.id.toString(),
        product,
      ]),
    );

    const variantMap = new Map(
      variants.map((variant) => [
        variant.id.toString(),
        variant,
      ]),
    );

    // =====================================================
    // 7. Build OrderItems and calculate money
    // =====================================================

    const orderItemsData = input.items.map(
      (item) => {
        const variant =
          variantMap.get(
            BigInt(item.variantId).toString(),
          );

        if (!variant) {
          throw new Error(
            "PRODUCT_VARIANT_NOT_FOUND",
          );
        }

        // Variant phải ACTIVE
        if (
          variant.status !==
          ProductStatus.ACTIVE
        ) {
          throw new Error(
            "PRODUCT_VARIANT_NOT_ACTIVE",
          );
        }

        const product =
          productMap.get(
            variant.productId.toString(),
          );

        if (!product) {
          throw new Error(
            "PRODUCT_NOT_FOUND",
          );
        }

        // Product phải ACTIVE
        if (
          product.status !==
          ProductStatus.ACTIVE
        ) {
          throw new Error(
            "PRODUCT_NOT_ACTIVE",
          );
        }

        const unitPrice =
          new Prisma.Decimal(
            variant.price,
          );

        const subtotal =
          unitPrice.mul(item.quantity);

        return {
          variantId: variant.id,
          productName: product.name,
          sku: variant.sku,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        };
      },
    );

    const subtotal =
      orderItemsData.reduce(
        (sum, item) =>
          sum.add(item.subtotal),
        new Prisma.Decimal(0),
      );

    // =====================================================
    // Server-side pricing
    // =====================================================

    const shippingFee =
      DEFAULT_SHIPPING_FEE;

    const discount =
      subtotal
        .mul(DEFAULT_DISCOUNT_RATE)
        .toDecimalPlaces(2);

    const totalAmount = subtotal
      .add(shippingFee)
      .sub(discount);

    const orderNumber =
      await this.generateOrderNumber();

    // =====================================================
    // 8. Reserve stock + create Order
    // =====================================================

    const paymentMethod =
      input.paymentMethod ?? PaymentMethod.COD;

    if (
      !Object.values(PaymentMethod).includes(
        paymentMethod,
      )
    ) {
      throw new Error(
        "INVALID_PAYMENT_METHOD",
      );
    }

    if (paymentMethod === PaymentMethod.ONLINE) {
      throw new Error(
        "ONLINE_PAYMENT_NOT_SUPPORTED",
      );
    }

    const paymentStatus =
      paymentMethod === PaymentMethod.WALLET
        ? PaymentStatus.PAID
        : PaymentStatus.UNPAID;

    const initialOrderStatus =
      paymentMethod === PaymentMethod.WALLET
        ? OrderStatus.CONFIRMED
        : OrderStatus.PENDING;

    return prisma.$transaction(
      async (tx) => {
        for (const item of input.items) {
          await inventoryService.reserveStockInTransaction(
            tx,
            item.variantId,
            item.quantity,
          );
        }

        return tx.order.create({
          data: {
            accountId: account.id,
            addressId,
            orderNumber,
            platform: account.platform,

            // Wallet được xác nhận ngay; COD và BANK_TRANSFER bắt đầu ở PENDING.
            status: initialOrderStatus,

            paymentStatus,
            paymentMethod,
            subtotal,
            shippingFee,
            discount,
            totalAmount,
            items: {
              create: orderItemsData,
            },
          },
          include: {
            account: {
              select: {
                id: true,
                personId: true,
                platform: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                person: true,
                memberProfile: true,
                franchiseProfile: true,
              },
            },
            address: true,
            items: {
              include: {
                variant: true,
              },
            },
          },
        });
      },
    );
  }

  async autoProcessPendingCodOrderIfDue(
    orderId: bigint,
    cutoff: Date,
  ): Promise<boolean> {
    const processingAt = await demoClockService.getNow();

    return prisma.$transaction(async (tx) => {
      // Bước 1: PENDING -> CONFIRMED.
      // Chỉ xử lý đơn COD chưa thanh toán đã đủ thời gian chờ.
      const confirmed = await tx.order.updateMany({
        where: {
          id: orderId,
          status: OrderStatus.PENDING,
          paymentMethod: PaymentMethod.COD,
          paymentStatus: PaymentStatus.UNPAID,
          createdAt: { lte: cutoff },
        },
        data: {
          status: OrderStatus.CONFIRMED,
        },
      });

      if (confirmed.count !== 1) {
        return false;
      }

      // Bước 2: CONFIRMED -> PROCESSING.
      // Hai bước nằm trong cùng transaction để tránh trạng thái
      // trung gian bị lưu lại nếu bước thứ hai thất bại.
      const processing = await tx.order.updateMany({
        where: {
          id: orderId,
          status: OrderStatus.CONFIRMED,
          paymentMethod: PaymentMethod.COD,
          paymentStatus: PaymentStatus.UNPAID,
        },
        data: {
          status: OrderStatus.PROCESSING,
          processingAt,
        },
      });

      if (processing.count !== 1) {
        throw new Error("ORDER_STATUS_CHANGED_CONCURRENTLY");
      }

      return true;
    });
  }

  async updateOrderStatus(
    id: bigint | number,
    newStatus: OrderStatus,
  ) {
    const orderId = BigInt(id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        platform: true,
        items: {
          select: {
            variantId: true,
            quantity: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const allowedTransitions: Record<
      OrderStatus,
      OrderStatus[]
    > = {
      [OrderStatus.PENDING]: [
        OrderStatus.CONFIRMED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.CONFIRMED]: [
        OrderStatus.PROCESSING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PROCESSING]: [
        OrderStatus.SHIPPING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.SHIPPING]: [
        OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.RETURNED]: [],
    };

    const allowedStatuses =
      allowedTransitions[order.status];

    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(
        "INVALID_ORDER_STATUS_TRANSITION",
      );
    }

    const data: {
      status: OrderStatus;
      paymentStatus?: PaymentStatus;
      processingAt?: Date;
      shippingAt?: Date;
      shippedAt?: Date;
      estimatedDeliveryAt?: Date;
      deliveredAt?: Date;
      commissionEligibleAt?: Date;
    } = {
      status: newStatus,
    };

    // =====================================================
    // CONFIRMED → PROCESSING
    // =====================================================

    if (
      order.status === OrderStatus.CONFIRMED &&
      newStatus === OrderStatus.PROCESSING
    ) {
      data.processingAt = await demoClockService.getNow();
    }

    // =====================================================
    // PROCESSING → SHIPPING
    // =====================================================

    if (
      order.status === OrderStatus.PROCESSING &&
      newStatus === OrderStatus.SHIPPING
    ) {
      const shippingAt = await demoClockService.getNow();

      const estimatedDeliveryAt = new Date(
        shippingAt.getTime() +
        2 * 24 * 60 * 60 * 1000,
      );

      data.shippingAt = shippingAt;

      // Giữ shippedAt để tương thích với code hiện tại.
      data.shippedAt = shippingAt;

      data.estimatedDeliveryAt = estimatedDeliveryAt;
    }

    // =====================================================
    // SHIPPING → DELIVERED
    // =====================================================

    if (
      order.status === OrderStatus.SHIPPING &&
      newStatus === OrderStatus.DELIVERED
    ) {
      const deliveredAt = await demoClockService.getNow();


      /*
       * BANK_TRANSFER:
       * Commission hold = 72h after DELIVERED.
       *
       * COD:
       * Payment becomes PAID at DELIVERED.
       * Commission hold = 120h after DELIVERED.
       *
       * WALLET:
       * Delivery is allowed.
       * WALLET commission hold duration has not
       * been finalized yet, so we intentionally do
       * NOT invent a hold duration here.
       */

      if (
        order.paymentMethod ===
        PaymentMethod.BANK_TRANSFER
      ) {
        data.commissionEligibleAt =
          new Date(
            deliveredAt.getTime() +
            72 * 60 * 60 * 1000,
          );
      } else if (
        order.paymentMethod ===
        PaymentMethod.COD
      ) {
        data.paymentStatus =
          PaymentStatus.PAID;

        data.commissionEligibleAt =
          new Date(
            deliveredAt.getTime() +
            120 * 60 * 60 * 1000,
          );
      } else if (
        order.paymentMethod ===
        PaymentMethod.WALLET
      ) {
        // Cho phép giao hàng.
        // Chưa tự đặt commission hold time.
      } else {
        throw new Error(
          "ONLINE_PAYMENT_NOT_SUPPORTED",
        );
      }

      data.deliveredAt = deliveredAt;
    }

    // =====================================================
    // CANCEL ORDER + RELEASE RESERVED STOCK
    // =====================================================

    if (newStatus === OrderStatus.CANCELLED) {
      return prisma.$transaction(async (tx) => {
        const transition = await tx.order.updateMany({
          where: {
            id: orderId,
            status: order.status,
          },
          data,
        });

        if (transition.count !== 1) {
          throw new Error("ORDER_STATUS_CHANGED_CONCURRENTLY");
        }

        await tx.paymentInstruction.updateMany({
          where: {
            orderId,
            type: PaymentInstructionType.ORDER_PAYMENT,
            status: {
              in: [
                PaymentInstructionStatus.WAITING,
                PaymentInstructionStatus.PARTIALLY_PAID,
              ],
            },
          },
          data: {
            status: PaymentInstructionStatus.CANCELLED,
          },
        });

        for (const item of order.items) {
          await inventoryService.releaseStockInTransaction(
            tx,
            item.variantId,
            item.quantity,
          );
        }

        return tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: {
            account: {
              select: {
                id: true,
                personId: true,
                platform: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                person: true,
                memberProfile: true,
                franchiseProfile: true,
              },
            },
            address: true,
            items: {
              include: {
                variant: true,
              },
            },
            commissionTransactions: true,
          },
        });
      });
    }

    // =====================================================
    // DELIVER ORDER + CONVERT RESERVED → SOLD
    // =====================================================

    if (newStatus === OrderStatus.DELIVERED) {
      return prisma.$transaction(async (tx) => {
        const transition = await tx.order.updateMany({
          where: {
            id: orderId,
            status: OrderStatus.SHIPPING,
          },
          data,
        });

        if (transition.count !== 1) {
          throw new Error("ORDER_STATUS_CHANGED_CONCURRENTLY");
        }

        for (const item of order.items) {
          await inventoryService.deductReservedStockInTransaction(
            tx,
            item.variantId,
            item.quantity,
          );
        }

        await inventoryIssueService.createForDeliveredOrder(
          tx,
          orderId,
        );

        // =====================================================
        // AUTO CREATE COMMISSION
        // =====================================================

        if (data.commissionEligibleAt) {
          const sourceType =
            order.platform === AccountPlatform.MEMBER
              ? CommissionSourceType.MEMBER_ORDER
              : CommissionSourceType.FRANCHISE_ORDER;

          await commissionService.createCommissionInTransaction(
            tx,
            {
              orderId,
              sourceType,
            },
            true,
          );
        }

        return tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: {
            account: {
              select: {
                id: true,
                personId: true,
                platform: true,
                email: true,
                phone: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                person: true,
                memberProfile: true,
                franchiseProfile: true,
              },
            },
            address: true,
            items: {
              include: {
                variant: true,
              },
            },
            commissionTransactions: true,
          },
        });
      });
    }


    return prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        account: {
          select: {
            id: true,
            personId: true,
            platform: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            person: true,
            memberProfile: true,
            franchiseProfile: true,
          },
        },
        address: true,
        items: {
          include: {
            variant: true,
          },
        },
        commissionTransactions: true,
      },
    });
  }


  async getMyOrders(
    accountId: bigint | number,
  ) {
    return prisma.order.findMany({
      where: {
        accountId: BigInt(accountId),
        platform: AccountPlatform.MEMBER,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        address: true,
        items: {
          include: {
            variant: true,
          },
        },
      },
    });
  }


  async getOrderById(
    id: bigint | number,
  ) {
    return prisma.order.findUnique({
      where: {
        id: BigInt(id),
      },
      include: {
        account: {
          select: {
            id: true,
            personId: true,
            platform: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            person: true,
            memberProfile: true,
            franchiseProfile: true,
          },
        },
        address: true,
        items: {
          include: {
            variant: true,
          },
        },
        commissionTransactions: true,
      },
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const prefix = `ORD-${year}-`;

    const latestOrder =
      await prisma.order.findFirst({
        where: {
          orderNumber: {
            startsWith: prefix,
          },
        },
        orderBy: {
          id: "desc",
        },
        select: {
          orderNumber: true,
        },
      });

    let nextNumber = 1;

    if (latestOrder) {
      const match =
        latestOrder.orderNumber.match(
          /^ORD-\d{4}-(\d+)$/,
        );

      if (match) {
        nextNumber =
          Number(match[1]) + 1;
      }
    }

    return `${prefix}${nextNumber
      .toString()
      .padStart(4, "0")}`;
  }
}

export const orderService =
  new OrderService();

