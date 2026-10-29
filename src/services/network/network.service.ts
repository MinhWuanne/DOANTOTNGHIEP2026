import { prisma } from "../../lib/prisma.js";

import {
  AccountPlatform,
  OrderStatus,
  PaymentStatus,
} from "../../generated/prisma/enums.js";
import { demoClockService } from "../demo-clock/demo-clock.service.js";

export interface DownlineAccount {
  id: bigint;
  personId: bigint;
  platform: AccountPlatform;
  email: string | null;
  phone: string | null;
  status: string;
  level: number;
}

export interface DownlineStats {
  directDownline: number;
  otherDownline: number;
  totalDownline: number;
  totalDownlineOrders: number;
  totalDownlineRevenue: number;
}

export class NetworkService {
  /**
   * Get direct downline of an account.
   *
   * Direct downline means accounts whose ReferralRelationship.sourceAccountId
   * is exactly the given accountId.
   */
  async getDirectDownline(
    accountId: bigint | number,
  ): Promise<DownlineAccount[]> {
    const sourceAccountId = BigInt(accountId);

    const referrals =
      await prisma.referralRelationship.findMany({
        where: {
          sourceAccountId,
        },
        include: {
          targetAccount: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    return referrals.map((referral) => ({
      id: referral.targetAccount.id,
      personId: referral.targetAccount.personId,
      platform: referral.targetAccount.platform,
      email: referral.targetAccount.email,
      phone: referral.targetAccount.phone,
      status: referral.targetAccount.status,
      level: 1,
    }));
  }

  /**
   * Get every descendant below an account.
   *
   * The network can have unlimited depth.
   *
   * Example:
   *
   * FR-A
   * └── MB-B          level 1
   *     └── MB-C      level 2
   *         └── MB-D  level 3
   *
   * No commission calculation happens here.
   */
  async getAllDownline(
    accountId: bigint | number,
  ): Promise<DownlineAccount[]> {
    const rootAccountId = BigInt(accountId);

    const rootAccount = await prisma.userAccount.findUnique({
      where: {
        id: rootAccountId,
      },
      select: {
        id: true,
      },
    });

    if (!rootAccount) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    const result: DownlineAccount[] = [];

    const queue: Array<{
      accountId: bigint;
      level: number;
    }> = [
        {
          accountId: rootAccountId,
          level: 0,
        },
      ];

    const visited = new Set<string>();

    visited.add(rootAccountId.toString());

    while (queue.length > 0) {
      const current = queue.shift()!;

      const referrals =
        await prisma.referralRelationship.findMany({
          where: {
            sourceAccountId: current.accountId,
          },
          include: {
            targetAccount: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        });

      for (const referral of referrals) {
        const target = referral.targetAccount;

        const targetKey = target.id.toString();

        if (visited.has(targetKey)) {
          continue;
        }

        visited.add(targetKey);

        const level = current.level + 1;

        result.push({
          id: target.id,
          personId: target.personId,
          platform: target.platform,
          email: target.email,
          phone: target.phone,
          status: target.status,
          level,
        });

        queue.push({
          accountId: target.id,
          level,
        });
      }
    }

    return result;
  }

  /**
   * Get network statistics.
   *
   * directDownline:
   *   Direct children of the account.
   *
   * otherDownline:
   *   All descendants excluding direct children.
   *
   * totalDownline:
   *   directDownline + otherDownline.
   */
  async getDownlineStats(
    accountId: bigint | number,
  ): Promise<DownlineStats> {
    const allDownline = await this.getAllDownline(accountId);

    const directDownline = allDownline.filter(
      (account) => account.level === 1,
    ).length;

    const totalDownline = allDownline.length;

    const otherDownline =
      totalDownline - directDownline;

    // Chỉ thống kê đơn hàng thuộc tài khoản MEMBER
    // trong toàn bộ mạng tuyến dưới.
    const memberAccountIds = allDownline
      .filter(
        (account) =>
          account.platform === AccountPlatform.MEMBER,
      )
      .map((account) => account.id);

    let totalDownlineOrders = 0;
    let totalDownlineRevenue = 0;

    if (memberAccountIds.length > 0) {
      const now = await demoClockService.getNow();

      const orders = await prisma.order.findMany({
        where: {
          accountId: {
            in: memberAccountIds,
          },
          platform: AccountPlatform.MEMBER,
          status: {
            notIn: [
              OrderStatus.CANCELLED,
              OrderStatus.RETURNED,
            ],
          },
        },
        select: {
          status: true,
          paymentStatus: true,
          totalAmount: true,
          commissionEligibleAt: true,
        },
      });

      totalDownlineOrders = orders.length;

      totalDownlineRevenue = orders.reduce(
        (sum, order) => {
          const isEligibleRevenue =
            order.status === OrderStatus.DELIVERED &&
            order.paymentStatus === PaymentStatus.PAID &&
            order.commissionEligibleAt !== null &&
            order.commissionEligibleAt <= now;

          if (!isEligibleRevenue) {
            return sum;
          }

          return sum + Number(order.totalAmount);
        },
        0,
      );
    }

    return {
      directDownline,
      otherDownline,
      totalDownline,
      totalDownlineOrders,
      totalDownlineRevenue,
    };
  }
}

export const networkService = new NetworkService();