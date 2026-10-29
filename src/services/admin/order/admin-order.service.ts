import { prisma } from "../../../lib/prisma.js";
import {
  OrderStatus,
} from "../../../generated/prisma/enums.js";
import {
  orderService,
} from "../../order/order.service.js";

export class AdminOrderService {
  async getOrders() {
    return prisma.order.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        orderNumber: true,

        accountId: true,

        subtotal: true,
        shippingFee: true,
        discount: true,
        totalAmount: true,

        paymentMethod: true,
        paymentStatus: true,
        status: true,

        createdAt: true,
        updatedAt: true,

        account: {
          select: {
            id: true,
            platform: true,

            person: {
              select: {
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async getOrderById(orderId: bigint | number) {
    const id = BigInt(orderId);

    const order = await prisma.order.findUnique({
      where: {
        id,
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

            person: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },

            memberProfile: true,
            franchiseProfile: true,
          },
        },

        address: true,

        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },

        commissionTransactions: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    return order;
  }

  async updateOrderStatus(
    orderId: bigint | number,
    status: OrderStatus,
  ) {
    return orderService.updateOrderStatus(
      BigInt(orderId),
      status,
    );
  }
}

export const adminOrderService = new AdminOrderService();