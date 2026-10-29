import { prisma } from "../../lib/prisma.js";
import {
  OrderStatus,
  PaymentStatus,
} from "../../generated/prisma/enums.js";
import { demoClockService } from "../demo-clock/demo-clock.service.js";

export class CommissionEligibilityService {
  async isCommissionEligible(
    orderId: bigint | number,
  ): Promise<boolean> {
    const id = BigInt(orderId);

    const order = await prisma.order.findUnique({
      where: {
        id,
      },
      select: {
        status: true,
        paymentStatus: true,
        commissionEligibleAt: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    // Order phải giao thành công
    if (order.status !== OrderStatus.DELIVERED) {
      return false;
    }

    // Khách hàng phải thanh toán thành công
    if (order.paymentStatus !== PaymentStatus.PAID) {
      return false;
    }

    // Phải có thời điểm đủ điều kiện
    if (!order.commissionEligibleAt) {
      return false;
    }

    // Dùng Demo Clock thay cho thời gian thực
    const now = await demoClockService.getNow();
    return now >= order.commissionEligibleAt;
  }
}

export const commissionEligibilityService =
  new CommissionEligibilityService();