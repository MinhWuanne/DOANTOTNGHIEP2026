import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import {
  AccountPlatform,
  CommissionStatus,
  OrderStatus,
  PaymentStatus,
  ReturnStatus,
  WalletTransactionType,
} from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { inventoryService } from "../inventory/inventory.service.js";
import { walletService } from "../wallet/wallet.service.js";

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

const RETURN_WINDOW_MS = 72 * 60 * 60 * 1000;

export class ReturnService {
  // ============================================================
  // CREATE RETURN REQUEST
  //
  // MEMBER chỉ được tạo Return trong vòng < 72h kể từ deliveredAt.
  //
  // Tạo request KHÔNG:
  // - refund
  // - restore inventory
  // - cancel commission
  // - đổi Order thành RETURNED
  // ============================================================
  async createReturnRequest(
    orderId: bigint | number,
    accountId: bigint | number,
    note?: string,
  ) {
    const orderIdBigInt = BigInt(orderId);
    const accountIdBigInt = BigInt(accountId);

    return prisma.$transaction(async (tx) => {
      // Khóa đơn hàng để đồng bộ với luồng thanh toán hoa hồng.
      await tx.$queryRaw`
      SELECT id
      FROM orders
      WHERE id = ${orderIdBigInt}
      FOR UPDATE
    `;

      const order = await tx.order.findUnique({
        where: {
          id: orderIdBigInt,
        },
        select: {
          id: true,
          accountId: true,
          platform: true,
          status: true,
          paymentStatus: true,
          deliveredAt: true,
          totalAmount: true,
          returnRequest: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      if (order.accountId !== accountIdBigInt) {
        throw new Error("ORDER_ACCESS_FORBIDDEN");
      }

      if (order.platform !== AccountPlatform.MEMBER) {
        throw new Error("MEMBER_ACCOUNT_REQUIRED");
      }

      if (order.status !== OrderStatus.DELIVERED) {
        throw new Error("RETURN_REQUIRES_DELIVERED_ORDER");
      }

      if (!order.deliveredAt) {
        throw new Error("ORDER_DELIVERED_AT_REQUIRED");
      }

      if (order.paymentStatus !== PaymentStatus.PAID) {
        throw new Error("RETURN_REQUIRES_PAID_ORDER");
      }

      if (order.returnRequest) {
        throw new Error("RETURN_REQUEST_ALREADY_EXISTS");
      }

      // Không cho trả hàng nếu hoa hồng của đơn đã được thanh toán.
      const commission = await tx.commissionTransaction.findUnique({
        where: {
          orderId: order.id,
        },
        select: {
          status: true,
        },
      });

      if (commission?.status === CommissionStatus.PAID) {
        throw new Error("RETURN_COMMISSION_ALREADY_PAID");
      }

      const now = Date.now();
      const deliveredAt = order.deliveredAt.getTime();

      if (now - deliveredAt >= RETURN_WINDOW_MS) {
        throw new Error("RETURN_WINDOW_EXPIRED");
      }

      return tx.returnRequest.create({
        data: {
          orderId: order.id,
          status: ReturnStatus.PENDING,
          note,
        },
        include: {
          order: true,
        },
      });
    });
  }

  // ============================================================
  // GET RETURN REQUEST
  // ============================================================
  async getReturnRequestById(id: bigint | number) {
    const returnId = BigInt(id);

    const request = await prisma.returnRequest.findUnique({
      where: {
        id: returnId,
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                variant: true,
              },
            },
            commissionTransactions: true,
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
          },
        },
      },
    });

    if (!request) {
      throw new Error("RETURN_REQUEST_NOT_FOUND");
    }

    return request;
  }


  // ============================================================
  // GET MEMBER RETURN REQUESTS
  // ============================================================
  async getMyReturnRequests(accountId: bigint | number) {
    const accountIdBigInt = BigInt(accountId);

    return prisma.returnRequest.findMany({
      where: {
        order: {
          accountId: accountIdBigInt,
          platform: AccountPlatform.MEMBER,
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                variant: true,
              },
            },
          },
        },
      },
    });
  }

  // ============================================================
  // GET MEMBER RETURN REQUEST BY ID
  // ============================================================
  async getMyReturnRequestById(
    id: bigint | number,
    accountId: bigint | number,
  ) {
    const returnId = BigInt(id);
    const accountIdBigInt = BigInt(accountId);

    const request = await prisma.returnRequest.findFirst({
      where: {
        id: returnId,
        order: {
          accountId: accountIdBigInt,
          platform: AccountPlatform.MEMBER,
        },
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                variant: true,
              },
            },
            commissionTransactions: true,
          },
        },
      },
    });

    if (!request) {
      throw new Error("RETURN_REQUEST_NOT_FOUND");
    }

    return request;
  }


  // ============================================================
  // GET RETURN REQUEST BY ORDER
  // ============================================================
  async getReturnRequestByOrderId(
    orderId: bigint | number,
  ) {
    return prisma.returnRequest.findUnique({
      where: {
        orderId: BigInt(orderId),
      },
      include: {
        order: {
          include: {
            items: {
              include: {
                variant: true,
              },
            },
            commissionTransactions: true,
          },
        },
      },
    });
  }

  // ============================================================
  // REJECT RETURN
  //
  // PENDING → REJECTED
  //
  // Không:
  // - refund
  // - restore inventory
  // - cancel commission
  // - thay đổi Order
  // ============================================================
  // ============================================================
  // REJECT RETURN
  //
  // PENDING → REJECTED
  //
  // Không:
  // - refund
  // - restore inventory
  // - cancel commission
  // - thay đổi Order
  //
  // Conditional update bảo vệ concurrency:
  // chỉ một request có thể chuyển PENDING → REJECTED.
  // ============================================================
  async rejectReturn(
    id: bigint | number,
    note?: string,
  ) {
    const returnId = BigInt(id);

    // ----------------------------------------------------------
    // 1. Kiểm tra ReturnRequest có tồn tại hay không.
    // ----------------------------------------------------------
    const request = await prisma.returnRequest.findUnique({
      where: {
        id: returnId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!request) {
      throw new Error("RETURN_REQUEST_NOT_FOUND");
    }

    // ----------------------------------------------------------
    // 2. Conditional update.
    //
    // Quan trọng:
    // Không UPDATE chỉ theo id.
    //
    // Phải đồng thời yêu cầu:
    // id = returnId
    // AND status = PENDING
    //
    // Nếu hai ADMIN reject cùng lúc:
    //
    // ADMIN A:
    // PENDING → REJECTED (count = 1) ✅
    //
    // ADMIN B:
    // PENDING → không còn đúng nữa (count = 0) ❌
    // ----------------------------------------------------------
    const rejected =
      await prisma.returnRequest.updateMany({
        where: {
          id: returnId,
          status: ReturnStatus.PENDING,
        },
        data: {
          status: ReturnStatus.REJECTED,
          note,
        },
      });

    if (rejected.count !== 1) {
      throw new Error(
        "INVALID_RETURN_STATUS_TRANSITION",
      );
    }

    // ----------------------------------------------------------
    // 3. Load final state.
    // ----------------------------------------------------------
    return prisma.returnRequest.findUniqueOrThrow({
      where: {
        id: returnId,
      },
      include: {
        order: true,
      },
    });
  }

  // ============================================================
  // APPROVE + REFUND
  //
  // PENDING
  //    ↓
  // APPROVED
  //    ↓
  // Transaction
  //    ├── Commission → CANCELLED
  //    ├── Inventory  → RESTORE
  //    ├── Payment     → REFUNDED
  //    ├── Wallet      → + order.totalAmount
  //    ├── WalletTransaction → REFUND
  //    ├── Order       → RETURNED
  //    └── Return      → REFUNDED
  //
  // Tất cả thành công cùng nhau.
  // ============================================================
  async approveReturn(id: bigint | number) {
    const returnId = BigInt(id);

    const request = await prisma.returnRequest.findUnique({
      where: {
        id: returnId,
      },
      select: {
        id: true,
        status: true,
        orderId: true,
      },
    });

    if (!request) {
      throw new Error("RETURN_REQUEST_NOT_FOUND");
    }

    if (request.status !== ReturnStatus.PENDING) {
      throw new Error("INVALID_RETURN_STATUS_TRANSITION");
    }

    return prisma.$transaction(async (tx) => {
      // --------------------------------------------------------
      // 1. Khóa đơn hàng để đồng bộ với luồng thanh toán hoa hồng.
      // --------------------------------------------------------
      await tx.$queryRaw`
    SELECT id
    FROM orders
    WHERE id = ${request.orderId}
    FOR UPDATE
  `;

      // --------------------------------------------------------
      // 2. Lock/check ReturnRequest state.
      // --------------------------------------------------------
      const approved = await tx.returnRequest.updateMany({
        where: {
          id: returnId,
          status: ReturnStatus.PENDING,
        },
        data: {
          status: ReturnStatus.APPROVED,
          approvedAt: new Date(),
        },
      });

      if (approved.count !== 1) {
        throw new Error("INVALID_RETURN_STATUS_TRANSITION");
      }

      // --------------------------------------------------------
      // 2. Load Order inside the same transaction.
      // --------------------------------------------------------
      const order = await tx.order.findUnique({
        where: {
          id: request.orderId,
        },
        select: {
          id: true,
          accountId: true,
          platform: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          totalAmount: true,
          deliveredAt: true,
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

      if (order.platform !== AccountPlatform.MEMBER) {
        throw new Error("MEMBER_ACCOUNT_REQUIRED");
      }

      if (order.status !== OrderStatus.DELIVERED) {
        throw new Error("RETURN_REQUIRES_DELIVERED_ORDER");
      }

      if (!order.deliveredAt) {
        throw new Error("ORDER_DELIVERED_AT_REQUIRED");
      }

      if (order.paymentStatus !== PaymentStatus.PAID) {
        throw new Error("RETURN_REQUIRES_PAID_ORDER");
      }

      // --------------------------------------------------------
      // 4. Commission
      //
      // Nếu commission đã PAID → không được Refund.
      //
      // Nếu PENDING / APPROVED → CANCELLED.
      //
      // Conditional update bảo vệ race với payCommission().
      // --------------------------------------------------------
      const commissions =
        await tx.commissionTransaction.findMany({
          where: {
            orderId: order.id,
          },
          select: {
            id: true,
            status: true,
          },
        });

      for (const commission of commissions) {
        if (commission.status === CommissionStatus.PAID) {
          throw new Error(
            "RETURN_COMMISSION_ALREADY_PAID",
          );
        }
      }

      for (const commission of commissions) {
        if (
          commission.status === CommissionStatus.PENDING ||
          commission.status === CommissionStatus.APPROVED
        ) {
          const cancelled =
            await tx.commissionTransaction.updateMany({
              where: {
                id: commission.id,
                status: {
                  in: [
                    CommissionStatus.PENDING,
                    CommissionStatus.APPROVED,
                  ],
                },
              },
              data: {
                status: CommissionStatus.CANCELLED,
              },
            });

          if (cancelled.count !== 1) {
            throw new Error(
              "RETURN_COMMISSION_ALREADY_PAID",
            );
          }
        }
      }

      // --------------------------------------------------------
      // 5. Restore Inventory.
      // --------------------------------------------------------
      for (const item of order.items) {
        await inventoryService.restoreReturnedStockInTransaction(
          tx,
          item.variantId,
          item.quantity,
        );
      }

      // --------------------------------------------------------
      // 6. Payment → REFUNDED
      // --------------------------------------------------------
      const refundedPayment =
        await tx.order.updateMany({
          where: {
            id: order.id,
            paymentStatus: PaymentStatus.PAID,
          },
          data: {
            paymentStatus: PaymentStatus.REFUNDED,
          },
        });

      if (refundedPayment.count !== 1) {
        throw new Error(
          "INVALID_PAYMENT_STATUS_TRANSITION",
        );
      }

      // --------------------------------------------------------
      // 7. Wallet refund
      //
      // Refund = toàn bộ totalAmount của Order.
      // --------------------------------------------------------
      await walletService.creditInTransaction(
        tx,
        order.accountId,
        new Prisma.Decimal(order.totalAmount),
        WalletTransactionType.REFUND,
        `Refund for returned order #${order.id.toString()}`,
      );

      // --------------------------------------------------------
      // 8. Order → RETURNED
      // --------------------------------------------------------
      const returnedOrder =
        await tx.order.updateMany({
          where: {
            id: order.id,
            status: OrderStatus.DELIVERED,
          },
          data: {
            status: OrderStatus.RETURNED,
          },
        });

      if (returnedOrder.count !== 1) {
        throw new Error(
          "INVALID_ORDER_STATUS_TRANSITION",
        );
      }

      // --------------------------------------------------------
      // 9. ReturnRequest → REFUNDED
      // --------------------------------------------------------
      await tx.returnRequest.update({
        where: {
          id: returnId,
        },
        data: {
          status: ReturnStatus.REFUNDED,
          refundedAt: new Date(),
        },
      });

      // --------------------------------------------------------
      // 10. Return final state.
      // --------------------------------------------------------
      return tx.returnRequest.findUniqueOrThrow({
        where: {
          id: returnId,
        },
        include: {
          order: {
            include: {
              items: {
                include: {
                  variant: true,
                },
              },
              commissionTransactions: true,
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
            },
          },
        },
      });
    });
  }
}

export const returnService = new ReturnService();