import { prisma } from "../../../lib/prisma.js";

export class AdminCommissionService {
  async getCommissions() {
    return prisma.commissionTransaction.findMany({
      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        orderId: true,
        accountId: true,

        platform: true,
        sourceType: true,

        commissionBase: true,
        percentage: true,
        amount: true,
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

        order: {
          select: {
            id: true,
            orderNumber: true,

            status: true,
            paymentStatus: true,
            paymentMethod: true,

            totalAmount: true,
            commissionEligibleAt: true,
          },
        },

        rule: {
          select: {
            id: true,
            name: true,
            percentage: true,
            thresholdAmount: true,
          },
        },
      },
    });
  }
}

export const adminCommissionService =
  new AdminCommissionService();