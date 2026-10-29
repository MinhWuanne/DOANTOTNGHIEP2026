import { prisma } from "../../../lib/prisma.js";
import { withdrawalService } from "../../wallet/withdrawal.service.js";

export class AdminWithdrawalService {
  async getWithdrawals() {
    return prisma.withdrawalRequest.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        wallet: {
          include: {
            account: {
              select: {
                id: true,
                platform: true,
                person: {
                  select: {
                    id: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        bankAccount: {
          select: {
            id: true,
            accountNumber: true,
            ownerType: true,
            status: true,
          },
        },
      },
    });
  }

  async getWithdrawalById(
    withdrawalId: bigint | number,
  ) {
    const id = BigInt(withdrawalId);

    const withdrawal =
      await prisma.withdrawalRequest.findUnique({
        where: { id },
        include: {
          wallet: {
            include: {
              account: {
                select: {
                  id: true,
                  platform: true,
                  status: true,
                  person: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                      phone: true,
                    },
                  },
                },
              },
            },
          },
          bankAccount: {
            select: {
              id: true,
              accountNumber: true,
              ownerAccountId: true,
              ownerType: true,
              balance: true,
              status: true,
            },
          },
        },
      });

    if (!withdrawal) {
      throw new Error("WITHDRAWAL_NOT_FOUND");
    }

    return withdrawal;
  }

  async approveWithdrawal(
    withdrawalId: bigint | number,
  ) {
    return withdrawalService.approveWithdrawal(
      withdrawalId,
    );
  }

  async rejectWithdrawal(
    withdrawalId: bigint | number,
    note?: string,
  ) {
    return withdrawalService.rejectWithdrawal(
      withdrawalId,
      note,
    );
  }

  async completeWithdrawal(
    withdrawalId: bigint | number,
  ) {
    return withdrawalService.completeWithdrawal(
      withdrawalId,
    );
  }
}

export const adminWithdrawalService =
  new AdminWithdrawalService();