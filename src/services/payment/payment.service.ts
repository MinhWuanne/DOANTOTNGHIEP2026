import { prisma } from "../../lib/prisma.js";
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from "../../generated/prisma/enums.js";

function isValidPaymentStatus(
  status: unknown,
): status is PaymentStatus {
  return Object.values(PaymentStatus).includes(
    status as PaymentStatus,
  );
}

export class PaymentService {
  async getOrderPayment(id: bigint | number) {
    const orderId = BigInt(id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        accountId: true,
        platform: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
        deliveredAt: true,
        commissionEligibleAt: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    return order;
  }

  async updatePaymentStatus(
    id: bigint | number,
    newStatus: PaymentStatus,
  ) {
    const orderId = BigInt(id);

    if (!isValidPaymentStatus(newStatus)) {
      throw new Error("INVALID_PAYMENT_STATUS");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.RETURNED
    ) {
      throw new Error("PAYMENT_OPERATION_NOT_ALLOWED");
    }

    const currentStatus = order.paymentStatus;

    // ------------------------------------------------------------
    // REFUNDED is controlled by ReturnService.
    //
    // PaymentService must NOT allow:
    //
    // PAID → REFUNDED
    //
    // directly.
    //
    // Refund flow:
    // MEMBER requests return
    //      ↓
    // ADMIN approves
    //      ↓
    // ReturnService
    //      ↓
    // Payment → REFUNDED
    //      ↓
    // Wallet → REFUND
    //      ↓
    // Order → RETURNED
    // ------------------------------------------------------------
    if (newStatus === PaymentStatus.REFUNDED) {
      throw new Error("INVALID_PAYMENT_STATUS_TRANSITION");
    }

    // REFUNDED is terminal.
    if (currentStatus === PaymentStatus.REFUNDED) {
      throw new Error("INVALID_PAYMENT_STATUS_TRANSITION");
    }

    if (currentStatus === PaymentStatus.PAID) {
      throw new Error("INVALID_PAYMENT_STATUS_TRANSITION");
    }

    // ------------------------------------------------------------
    // Validate the requested transition before attempting the
    // atomic database update.
    // ------------------------------------------------------------

    if (newStatus === PaymentStatus.PENDING) {
      if (
        order.paymentMethod !== PaymentMethod.BANK_TRANSFER ||
        currentStatus !== PaymentStatus.UNPAID
      ) {
        throw new Error("INVALID_PAYMENT_STATUS_TRANSITION");
      }
    }

    if (newStatus === PaymentStatus.FAILED) {
      if (
        order.paymentMethod !== PaymentMethod.BANK_TRANSFER ||
        currentStatus !== PaymentStatus.PENDING
      ) {
        throw new Error("INVALID_PAYMENT_STATUS_TRANSITION");
      }
    }

    if (newStatus === PaymentStatus.PAID) {
      if (order.paymentMethod === PaymentMethod.BANK_TRANSFER) {
        if (currentStatus !== PaymentStatus.PENDING) {
          throw new Error("INVALID_PAYMENT_STATUS_TRANSITION");
        }

        throw new Error("BANK_TRANSFER_REQUIRES_VERIFIED_TRANSACTION");
      }

      if (order.paymentMethod === PaymentMethod.COD) {
        if (
          currentStatus !== PaymentStatus.UNPAID ||
          order.status !== OrderStatus.DELIVERED
        ) {
          throw new Error("COD_PAYMENT_REQUIRES_DELIVERED_ORDER");
        }
      }

      if (order.paymentMethod === PaymentMethod.ONLINE) {
        throw new Error("ONLINE_PAYMENT_NOT_SUPPORTED");
      }
    }

    // ------------------------------------------------------------
    // CONCURRENCY-SAFE UPDATE
    //
    // The current payment status is included in the WHERE clause.
    //
    // Example:
    //
    // Request A:
    //   UPDATE ... WHERE paymentStatus = UNPAID
    //   → 1 row updated
    //
    // Request B:
    //   UPDATE ... WHERE paymentStatus = UNPAID
    //   → 0 rows updated
    //
    // Therefore only one concurrent request can perform:
    //
    // UNPAID → PENDING
    //
    // The losing request receives INVALID_PAYMENT_STATUS_TRANSITION.
    // ------------------------------------------------------------

    let updateResult;

    if (newStatus === PaymentStatus.PENDING) {
      updateResult = await prisma.order.updateMany({
        where: {
          id: orderId,
          paymentStatus: PaymentStatus.UNPAID,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          status: {
            notIn: [
              OrderStatus.CANCELLED,
              OrderStatus.RETURNED,
            ],
          },
        },
        data: {
          paymentStatus: PaymentStatus.PENDING,
        },
      });
    } else if (newStatus === PaymentStatus.FAILED) {
      updateResult = await prisma.order.updateMany({
        where: {
          id: orderId,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: PaymentMethod.BANK_TRANSFER,
          status: {
            notIn: [
              OrderStatus.CANCELLED,
              OrderStatus.RETURNED,
            ],
          },
        },
        data: {
          paymentStatus: PaymentStatus.FAILED,
        },
      });
    } else if (newStatus === PaymentStatus.PAID) {
      if (order.paymentMethod === PaymentMethod.BANK_TRANSFER) {
        updateResult = await prisma.order.updateMany({
          where: {
            id: orderId,
            paymentStatus: PaymentStatus.PENDING,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            status: {
              notIn: [
                OrderStatus.CANCELLED,
                OrderStatus.RETURNED,
              ],
            },
          },
          data: {
            paymentStatus: PaymentStatus.PAID,
          },
        });
      } else if (order.paymentMethod === PaymentMethod.COD) {
        updateResult = await prisma.order.updateMany({
          where: {
            id: orderId,
            paymentStatus: PaymentStatus.UNPAID,
            paymentMethod: PaymentMethod.COD,
            status: OrderStatus.DELIVERED,
          },
          data: {
            paymentStatus: PaymentStatus.PAID,
          },
        });
      } else {
        throw new Error("ONLINE_PAYMENT_NOT_SUPPORTED");
      }
    } else {
      throw new Error("INVALID_PAYMENT_STATUS_TRANSITION");
    }

    // ------------------------------------------------------------
    // If zero rows were updated, another concurrent request has
    // already changed the payment status (or the order no longer
    // satisfies the transition conditions).
    // ------------------------------------------------------------

    if (updateResult.count !== 1) {
      throw new Error("INVALID_PAYMENT_STATUS_TRANSITION");
    }

    // Return the updated payment information.
    return prisma.order.findUniqueOrThrow({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        orderNumber: true,
        accountId: true,
        platform: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
        deliveredAt: true,
        commissionEligibleAt: true,
      },
    });
  }
}

export const paymentService = new PaymentService();