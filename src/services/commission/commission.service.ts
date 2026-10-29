import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { commissionEligibilityService } from "./commission-eligibility.service.js";
import { walletService } from "../wallet/wallet.service.js";
import {
  AccountPlatform,
  CommissionSourceType,
  FranchiseStatus,
  CommissionStatus,
  WalletTransactionType,
  OrderStatus,
  PaymentStatus,
} from "../../generated/prisma/enums.js";

import { PrismaClient } from "../../generated/prisma/client.js";
import { demoClockService } from "../demo-clock/demo-clock.service.js";

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

export interface CreateCommissionInput {
  orderId: bigint | number;
  sourceType: CommissionSourceType;
}

export type FranchiseCommissionPeriod =
  | "today"
  | "7days"
  | "week"
  | "month"
  | "year"
  | "custom";

export interface FranchiseCommissionFilter {
  accountId: bigint | number;
  period: FranchiseCommissionPeriod;
  from?: string;
  to?: string;
}

export class CommissionService {
  // ============================================================
  // CREATE COMMISSION
  // Backend tự xác định:
  // - người nhận commission
  // - CommissionRule
  // - percentage
  // - amount
  // ============================================================

  async createCommission(input: CreateCommissionInput) {
    return prisma.$transaction(async (tx) => {
      const commission =
        await this.createCommissionInTransaction(
          tx,
          input,
        );

      if (!commission) {
        throw new Error("COMMISSION_CREATION_FAILED");
      }

      return commission;
    });
  }


  async createCommissionInTransaction(
    tx: PrismaTransactionClient,
    input: CreateCommissionInput,
    skipUnavailable = false,
  ) {
    try {
      const orderId = BigInt(input.orderId);

      const order = await tx.order.findUnique({
        where: {
          id: orderId,
        },
        select: {
          id: true,
          accountId: true,
          platform: true,
          totalAmount: true,
        },
      });

      if (!order) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const expectedSourceType =
        order.platform === AccountPlatform.MEMBER
          ? CommissionSourceType.MEMBER_ORDER
          : CommissionSourceType.FRANCHISE_ORDER;

      if (input.sourceType !== expectedSourceType) {
        throw new Error("SOURCE_TYPE_PLATFORM_MISMATCH");
      }

      const referral =
        await tx.referralRelationship.findUnique({
          where: {
            targetAccountId: order.accountId,
          },
          select: {
            sourceAccountId: true,
          },
        });

      if (
        !referral ||
        referral.sourceAccountId === null
      ) {
        throw new Error("DIRECT_REFERRER_NOT_FOUND");
      }

      const recipientAccount =
        await tx.userAccount.findUnique({
          where: {
            id: referral.sourceAccountId,
          },
          select: {
            id: true,
            platform: true,
            franchiseProfile: {
              select: {
                status: true,
              },
            },
          },
        });

      if (!recipientAccount) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      if (
        recipientAccount.platform ===
        AccountPlatform.FRANCHISE &&
        recipientAccount.franchiseProfile?.status !==
        FranchiseStatus.ACTIVE
      ) {
        throw new Error("FRANCHISE_NOT_ACTIVE");
      }

      const commissionBase =
        new Prisma.Decimal(order.totalAmount);

      if (commissionBase.isNegative()) {
        throw new Error("INVALID_COMMISSION_BASE");
      }

      const rules =
        await tx.commissionRule.findMany({
          where: {
            platform: recipientAccount.platform,
            isActive: true,
          },
          select: {
            id: true,
            platform: true,
            percentage: true,
            thresholdAmount: true,
            isActive: true,
          },
          orderBy: {
            percentage: "asc",
          },
        });

      if (rules.length === 0) {
        throw new Error("COMMISSION_RULE_NOT_FOUND");
      }

      const threshold = new Prisma.Decimal(
        rules[0].thresholdAmount,
      );

      const rule =
        commissionBase.lessThanOrEqualTo(threshold)
          ? rules[0]
          : rules[rules.length - 1];

      const percentage =
        new Prisma.Decimal(rule.percentage);

      const amount = commissionBase
        .mul(percentage)
        .div(100);

      return await tx.commissionTransaction.create({
        data: {
          orderId: order.id,
          accountId: recipientAccount.id,
          ruleId: rule.id,
          platform: recipientAccount.platform,
          sourceType: input.sourceType,
          commissionBase,
          percentage,
          amount,
          status: CommissionStatus.PENDING,
        },
        include: {
          order: true,
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
          rule: true,
        },
      });
    } catch (error) {
      const errorCode =
        error instanceof Error
          ? error.message
          : "";

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        if (skipUnavailable) {
          console.warn("[COMMISSION_SKIPPED]", {
            orderId: input.orderId.toString(),
            reason: "P2002",
          });

          return null;
        }

        throw new Error("COMMISSION_ALREADY_EXISTS");
      }

      const skippableErrors = [
        "DIRECT_REFERRER_NOT_FOUND",
        "FRANCHISE_NOT_ACTIVE",
        "COMMISSION_RULE_NOT_FOUND",
        "COMMISSION_ALREADY_EXISTS",
      ];

      if (
        skipUnavailable &&
        skippableErrors.includes(errorCode)
      ) {
        console.warn("[COMMISSION_SKIPPED]", {
          orderId: input.orderId.toString(),
          reason: errorCode,
        });

        return null;
      }

      throw error;
    }
  }

  // ============================================================
  // APPROVE COMMISSION
  // Chỉ APPROVED khi Commission đã đủ điều kiện.
  // ============================================================
  async approveCommission(id: bigint | number) {
    const commissionId = BigInt(id);

    const commission = await prisma.commissionTransaction.findUnique({
      where: {
        id: commissionId,
      },
      select: {
        id: true,
        status: true,
        orderId: true,
      },
    });

    if (!commission) {
      throw new Error("COMMISSION_NOT_FOUND");
    }

    if (commission.status !== CommissionStatus.PENDING) {
      throw new Error("INVALID_COMMISSION_STATUS_TRANSITION");
    }

    const eligible =
      await commissionEligibilityService.isCommissionEligible(
        commission.orderId,
      );

    if (!eligible) {
      throw new Error("COMMISSION_NOT_ELIGIBLE");
    }

    const updated =
      await prisma.commissionTransaction.updateMany({
        where: {
          id: commissionId,
          status: CommissionStatus.PENDING,
        },
        data: {
          status: CommissionStatus.APPROVED,
        },
      });

    if (updated.count !== 1) {
      throw new Error(
        "INVALID_COMMISSION_STATUS_TRANSITION",
      );
    }

    return prisma.commissionTransaction.findUniqueOrThrow({
      where: {
        id: commissionId,
      },
      include: {
        order: true,
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
        rule: true,
      },
    });
  }

  // ============================================================
  // AUTO APPROVE ELIGIBLE COMMISSIONS
  // Chỉ duyệt hoa hồng đã đủ điều kiện.
  // Không tự động thanh toán.
  // ============================================================

  async approveEligibleCommissions() {
    const now = await demoClockService.getNow();

    const commissions =
      await prisma.commissionTransaction.findMany({
        where: {
          status: CommissionStatus.PENDING,
          order: {
            is: {
              status: OrderStatus.DELIVERED,
              paymentStatus: PaymentStatus.PAID,
              commissionEligibleAt: {
                lte: now,
              },
            },
          },
        },
        select: {
          id: true,
        },
      });

    let approved = 0;
    let failed = 0;

    for (const commission of commissions) {
      try {
        await this.approveCommission(commission.id);
        approved += 1;
      } catch {
        // Bỏ qua giao dịch lỗi hoặc đã được xử lý đồng thời.
        // Lượt quét tiếp theo sẽ kiểm tra lại.
        failed += 1;
      }
    }

    return {
      checked: commissions.length,
      approved,
      failed,
    };
  }

  // ============================================================
  // PAY COMMISSION
  //
  // APPROVED
  //    ↓
  // Transaction
  //    ├── Commission → PAID
  //    ├── Wallet     → + commission amount
  //    └── WalletTransaction(COMMISSION)
  //
  // Tất cả phải thành công cùng nhau.
  // ============================================================


  // ============================================================
  // AUTO PAY ELIGIBLE COMMISSIONS
  // Thanh toán các Commission đã duyệt và đủ điều kiện.
  // ============================================================

  async payEligibleCommissions() {
    const now = await demoClockService.getNow();

    const commissions =
      await prisma.commissionTransaction.findMany({
        where: {
          status: CommissionStatus.APPROVED,
          order: {
            is: {
              status: OrderStatus.DELIVERED,
              paymentStatus: PaymentStatus.PAID,
              commissionEligibleAt: {
                lte: now,
              },
            },
          },
        },
        select: {
          id: true,
        },
      });

    let paid = 0;
    let failed = 0;

    for (const commission of commissions) {
      try {
        await this.payCommission(commission.id);
        paid += 1;
      } catch (error) {
        failed += 1;

        console.error(
          "[COMMISSION_AUTO_PAY_FAILED]",
          {
            commissionId: commission.id.toString(),
            error:
              error instanceof Error
                ? error.message
                : "UNKNOWN_ERROR",
          },
        );
      }
    }

    return {
      checked: commissions.length,
      paid,
      failed,
    };
  }
  async payCommission(id: bigint | number) {
    const commissionId = BigInt(id);

    const commission = await prisma.commissionTransaction.findUnique({
      where: {
        id: commissionId,
      },
      select: {
        id: true,
        status: true,
        orderId: true,
        accountId: true,
        amount: true,
      },
    });

    if (!commission) {
      throw new Error("COMMISSION_NOT_FOUND");
    }

    if (commission.status !== CommissionStatus.APPROVED) {
      throw new Error("INVALID_COMMISSION_STATUS_TRANSITION");
    }

    return prisma.$transaction(async (tx) => {
      // --------------------------------------------------------
      // Kiểm tra lại trạng thái trong transaction.
      //
      // updateMany + status = APPROVED giúp tránh việc cùng một
      // Commission bị pay hai lần trong các request đồng thời.
      // --------------------------------------------------------
      const updated = await tx.commissionTransaction.updateMany({
        where: {
          id: commissionId,
          status: CommissionStatus.APPROVED,
        },
        data: {
          status: CommissionStatus.PAID,
        },
      });

      if (updated.count !== 1) {
        throw new Error("INVALID_COMMISSION_STATUS_TRANSITION");
      }

      // --------------------------------------------------------
      // Cộng tiền vào Wallet của người NHẬN commission.
      //
      // Không phải Wallet của buyer.
      // commission.accountId = direct referrer.
      // --------------------------------------------------------
      await walletService.creditInTransaction(
        tx,
        commission.accountId,
        commission.amount,
        WalletTransactionType.COMMISSION,
        `Commission payment for commission #${commission.id.toString()}`,
      );

      // --------------------------------------------------------
      // Trả về Commission sau khi đã PAID.
      // --------------------------------------------------------
      return tx.commissionTransaction.findUniqueOrThrow({
        where: {
          id: commissionId,
        },
        include: {
          order: true,
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
          rule: true,
        },
      });
    });
  }

  // ============================================================
  // GET FRANCHISE COMMISSIONS
  // Thống kê và danh sách hoa hồng của tài khoản Franchise.
  // ============================================================

  private getFranchiseCommissionDateRange(
    period: FranchiseCommissionPeriod,
    from?: string,
    to?: string,
  ): { startAt: Date; endAt: Date } {
    const now = new Date();

    const startOfDay = (date: Date): Date => {
      const result = new Date(date);
      result.setHours(0, 0, 0, 0);
      return result;
    };

    const startAt = startOfDay(now);
    let endAt: Date;

    switch (period) {
      case "today": {
        endAt = new Date(startAt);
        endAt.setDate(endAt.getDate() + 1);
        break;
      }

      case "7days": {
        startAt.setDate(startAt.getDate() - 6);
        endAt = new Date(now);
        endAt.setHours(0, 0, 0, 0);
        endAt.setDate(endAt.getDate() + 1);
        break;
      }

      case "week": {
        const dayOfWeek = startAt.getDay();
        const daysSinceMonday = (dayOfWeek + 6) % 7;

        startAt.setDate(startAt.getDate() - daysSinceMonday);

        endAt = new Date(startAt);
        endAt.setDate(endAt.getDate() + 7);
        break;
      }

      case "month": {
        startAt.setDate(1);

        endAt = new Date(startAt);
        endAt.setMonth(endAt.getMonth() + 1);
        break;
      }

      case "year": {
        startAt.setMonth(0, 1);

        endAt = new Date(startAt);
        endAt.setFullYear(endAt.getFullYear() + 1);
        break;
      }

      case "custom": {
        const isValidDate = (value: string | undefined): boolean => {
          if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
          }

          const parsed = new Date(`${value}T00:00:00`);

          return (
            !Number.isNaN(parsed.getTime()) &&
            parsed.getFullYear() === Number(value.slice(0, 4)) &&
            parsed.getMonth() + 1 === Number(value.slice(5, 7)) &&
            parsed.getDate() === Number(value.slice(8, 10))
          );
        };

        if (!isValidDate(from) || !isValidDate(to)) {
          throw new Error("INVALID_COMMISSION_DATE_RANGE");
        }

        const customStart = new Date(`${from}T00:00:00`);
        const customEnd = new Date(`${to}T00:00:00`);

        if (customStart > customEnd) {
          throw new Error("INVALID_COMMISSION_DATE_RANGE");
        }

        endAt = new Date(customEnd);
        endAt.setDate(endAt.getDate() + 1);

        return {
          startAt: customStart,
          endAt,
        };
      }

      default:
        throw new Error("INVALID_COMMISSION_PERIOD");
    }

    return { startAt, endAt };
  }


  // ============================================================
  // GET FRANCHISE COMMISSIONS DATA
  // ============================================================
  async getFranchiseCommissions(
    filter: FranchiseCommissionFilter,
  ) {
    const accountId = BigInt(filter.accountId);

    const { startAt, endAt } =
      this.getFranchiseCommissionDateRange(
        filter.period,
        filter.from,
        filter.to,
      );

    const commissions =
      await prisma.commissionTransaction.findMany({
        where: {
          accountId,
          platform: AccountPlatform.FRANCHISE,
          createdAt: {
            gte: startAt,
            lt: endAt,
          },
        },
        select: {
          id: true,
          orderId: true,
          amount: true,
          status: true,
          createdAt: true,
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    const validCommissions = commissions.filter(
      (commission) =>
        commission.status !== CommissionStatus.CANCELLED,
    );

    const sumAmount = (items: typeof commissions): number =>
      items.reduce(
        (total, item) => total + Number(item.amount),
        0,
      );

    const pendingCommissions = validCommissions.filter(
      (commission) =>
        commission.status === CommissionStatus.PENDING,
    );

    const approvedCommissions = validCommissions.filter(
      (commission) =>
        commission.status === CommissionStatus.APPROVED,
    );

    const paidCommissions = validCommissions.filter(
      (commission) =>
        commission.status === CommissionStatus.PAID,
    );

    const useMonthlyChart =
      endAt.getTime() - startAt.getTime() >
      31 * 24 * 60 * 60 * 1000;

    const getChartKey = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return useMonthlyChart
        ? `${year}-${month}`
        : `${year}-${month}-${day}`;
    };

    const chartMap = new Map<
      string,
      { amount: number; orders: number }
    >();

    for (const commission of validCommissions) {
      const key = getChartKey(commission.createdAt);
      const current = chartMap.get(key) ?? {
        amount: 0,
        orders: 0,
      };

      current.amount += Number(commission.amount);
      current.orders += 1;

      chartMap.set(key, current);
    }

    const chart = Array.from(chartMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, values]) => ({
        period,
        amount: values.amount,
        orders: values.orders,
      }));

    return {
      period: filter.period,
      dateRange: {
        from: startAt,
        to: new Date(endAt.getTime() - 1),
      },
      summary: {
        totalOrders: validCommissions.length,
        totalCommission: sumAmount(validCommissions),
        pendingAmount: sumAmount(pendingCommissions),
        approvedAmount: sumAmount(approvedCommissions),
        paidAmount: sumAmount(paidCommissions),
      },
      chart,
      items: commissions.map((commission) => ({
        id: commission.id.toString(),
        orderId: commission.orderId.toString(),
        orderNumber: commission.order.orderNumber,
        createdAt: commission.createdAt,
        amount: Number(commission.amount),
        status: commission.status,
      })),
    };
  }


  // ============================================================
  // GET COMMISSION BY ID
  // ============================================================
  async getCommissionById(id: bigint | number) {
    return prisma.commissionTransaction.findUnique({
      where: {
        id: BigInt(id),
      },
      include: {
        order: true,
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
        rule: true,
      },
    });
  }
}

export const commissionService = new CommissionService();