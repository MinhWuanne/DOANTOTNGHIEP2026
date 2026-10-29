
import { randomUUID } from "node:crypto";

import {
  AccountPlatform,
  AdminRole,
  AdminStatus,
  ComplaintStatus,
  FinancialAdjustmentDirection,
  FinancialAdjustmentReason,
  FinancialAdjustmentStatus,
  WalletTransactionType,
} from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import { passwordService } from "../../auth/password.service.js";

const ADJUSTMENT_EXPIRY_MINUTES = 15;
const MAX_AMOUNT = new Prisma.Decimal("9999999999999.99");

const adjustmentInclude = {
  recipient: {
    select: {
      id: true,
      platform: true,
      email: true,
      phone: true,
      status: true,
      person: {
        select: {
          fullName: true,
        },
      },
    },
  },
  createdBy: {
    select: {
      id: true,
      username: true,
    },
  },
  confirmedBy: {
    select: {
      id: true,
      username: true,
    },
  },
  walletTransaction: true,
} as const;

export interface CreateFinancialAdjustmentInput {
  recipientAccountId: string;
  complaintId?: string;
  direction: FinancialAdjustmentDirection;
  amount: string | number;
  reason: FinancialAdjustmentReason;
  note?: string | null;
}

export interface ListFinancialAdjustmentsParams {
  page?: number;
  limit?: number;
  status?: FinancialAdjustmentStatus;
  search?: string;
}

export class FinancialAdjustmentService {
  private parseAccountId(id: string): bigint {
    if (!/^[1-9]\d*$/.test(id)) {
      throw new Error("INVALID_ACCOUNT_ID");
    }

    return BigInt(id);
  }

  private parseAmount(value: string | number): Prisma.Decimal {
    const raw = String(value).trim();

    if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(raw)) {
      throw new Error("INVALID_ADJUSTMENT_AMOUNT");
    }

    const amount = new Prisma.Decimal(raw);

    if (amount.lte(0) || amount.gt(MAX_AMOUNT)) {
      throw new Error("INVALID_ADJUSTMENT_AMOUNT");
    }

    return amount;
  }

  private validateDirection(
    direction: FinancialAdjustmentDirection,
  ): void {
    if (
      !Object.values(FinancialAdjustmentDirection).includes(direction)
    ) {
      throw new Error("INVALID_ADJUSTMENT_DIRECTION");
    }
  }

  private validateReason(reason: FinancialAdjustmentReason): void {
    if (!Object.values(FinancialAdjustmentReason).includes(reason)) {
      throw new Error("INVALID_ADJUSTMENT_REASON");
    }
  }

  private buildDescription(
    direction: FinancialAdjustmentDirection,
    reason: FinancialAdjustmentReason,
    note?: string | null,
  ): string {
    const prefix =
      direction === FinancialAdjustmentDirection.CREDIT
        ? "Điều chỉnh ví: cộng tiền"
        : "Điều chỉnh ví: trừ tiền";

    const description = note?.trim()
      ? `${prefix} - ${reason} - ${note.trim()}`
      : `${prefix} - ${reason}`;

    return description.slice(0, 255);
  }

  async createAdjustment(
    input: CreateFinancialAdjustmentInput,
    adminId: string,
  ) {
    const createdByAdminId = this.parseAccountId(adminId);
    const recipientAccountId = this.parseAccountId(
      input.recipientAccountId,
    );
    const amount = this.parseAmount(input.amount);
    const note = input.note?.trim() || null;

    this.validateDirection(input.direction);
    this.validateReason(input.reason);

    if (input.reason === FinancialAdjustmentReason.OTHER && !note) {
      throw new Error("ADJUSTMENT_NOTE_REQUIRED");
    }

    const admin = await prisma.adminAccount.findUnique({
      where: { id: createdByAdminId },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!admin || admin.status !== AdminStatus.ACTIVE) {
      throw new Error("ADMIN_ACCOUNT_NOT_ACTIVE");
    }

    if (admin.role !== AdminRole.ADMIN) {
      throw new Error("ADMIN_ROLE_NOT_ALLOWED");
    }

    if (input.complaintId) {
      const complaintId = this.parseAccountId(input.complaintId);

      const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
        select: {
          id: true,
          accountId: true,
          status: true,
        },
      });

      if (!complaint) {
        throw new Error("COMPLAINT_NOT_FOUND");
      }

      if (complaint.accountId !== recipientAccountId) {
        throw new Error("COMPLAINT_RECIPIENT_MISMATCH");
      }

      if (complaint.status === ComplaintStatus.RESOLVED) {
        throw new Error("COMPLAINT_ALREADY_RESOLVED");
      }
    }

    const recipient = await prisma.userAccount.findUnique({
      where: { id: recipientAccountId },
      select: {
        id: true,
        platform: true,
        wallet: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!recipient) {
      throw new Error("ADJUSTMENT_RECIPIENT_NOT_FOUND");
    }

    if (
      recipient.platform !== AccountPlatform.MEMBER &&
      recipient.platform !== AccountPlatform.FRANCHISE
    ) {
      throw new Error("INVALID_ADJUSTMENT_RECIPIENT");
    }

    if (!recipient.wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + ADJUSTMENT_EXPIRY_MINUTES * 60 * 1000,
    );

    return prisma.financialAdjustment.create({
      data: {
        ticketCode: `FA-${randomUUID().toUpperCase()}`,
        recipientAccountId,
        createdByAdminId,
        direction: input.direction,
        amount,
        reason: input.reason,
        note,
        status: FinancialAdjustmentStatus.PENDING,
        expiresAt,
      },
      include: adjustmentInclude,
    });
  }

  async listAdjustments(
    params: ListFinancialAdjustmentsParams = {},
  ) {
    const page = Math.max(1, Math.floor(params.page ?? 1));
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(params.limit ?? 20)),
    );
    const search = params.search?.trim();

    const where: Prisma.FinancialAdjustmentWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(search
        ? {
          OR: [
            {
              ticketCode: {
                contains: search,
              },
            },
            {
              note: {
                contains: search,
              },
            },
            {
              recipient: {
                email: {
                  contains: search,
                },
              },
            },
            {
              recipient: {
                phone: {
                  contains: search,
                },
              },
            },
          ],
        }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.financialAdjustment.findMany({
        where,
        include: adjustmentInclude,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.financialAdjustment.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAdjustment(ticketCode: string) {
    const normalizedCode = ticketCode.trim();

    if (!normalizedCode) {
      throw new Error("INVALID_ADJUSTMENT_TICKET_CODE");
    }

    const adjustment = await prisma.financialAdjustment.findUnique({
      where: {
        ticketCode: normalizedCode,
      },
      include: adjustmentInclude,
    });

    if (!adjustment) {
      throw new Error("ADJUSTMENT_NOT_FOUND");
    }

    return adjustment;
  }

  async confirmAdjustment(
    ticketCode: string,
    adminId: string,
    password: string,
  ) {
    const confirmerAdminId = this.parseAccountId(adminId);
    const normalizedCode = ticketCode.trim();

    if (!normalizedCode) {
      throw new Error("INVALID_ADJUSTMENT_TICKET_CODE");
    }

    if (!password) {
      throw new Error("ADMIN_PASSWORD_REQUIRED");
    }

    const admin = await prisma.adminAccount.findUnique({
      where: {
        id: confirmerAdminId,
      },
      select: {
        id: true,
        role: true,
        status: true,
        passwordHash: true,
      },
    });

    if (!admin || admin.status !== AdminStatus.ACTIVE) {
      throw new Error("ADMIN_ACCOUNT_NOT_ACTIVE");
    }

    if (admin.role !== AdminRole.ADMIN) {
      throw new Error("ADMIN_ROLE_NOT_ALLOWED");
    }

    const passwordValid = await passwordService.verify(
      password,
      admin.passwordHash,
    );

    if (!passwordValid) {
      throw new Error("ADMIN_PASSWORD_INVALID");
    }

    let result:
      | {
        expired: true;
      }
      | {
        expired: false;
        adjustmentId: bigint;
        walletTransactionId: bigint;
      }
      | undefined;

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        result = await prisma.$transaction(async (tx) => {
          const adjustment = await tx.financialAdjustment.findUnique({
            where: {
              ticketCode: normalizedCode,
            },
          });

          if (!adjustment) {
            throw new Error("ADJUSTMENT_NOT_FOUND");
          }

          if (adjustment.status !== FinancialAdjustmentStatus.PENDING) {
            throw new Error("ADJUSTMENT_ALREADY_PROCESSED");
          }

          const now = new Date();

          if (now.getTime() >= adjustment.expiresAt.getTime()) {
            await tx.financialAdjustment.updateMany({
              where: {
                id: adjustment.id,
                status: FinancialAdjustmentStatus.PENDING,
              },
              data: {
                status: FinancialAdjustmentStatus.EXPIRED,
              },
            });

            return {
              expired: true as const,
            };
          }

          // Claim the ticket inside this transaction. If a later step fails,
          // the status change is rolled back together with all wallet changes.
          const claimed = await tx.financialAdjustment.updateMany({
            where: {
              id: adjustment.id,
              status: FinancialAdjustmentStatus.PENDING,
              expiresAt: {
                gt: now,
              },
            },
            data: {
              status: FinancialAdjustmentStatus.COMPLETED,
              confirmedByAdminId: confirmerAdminId,
              completedAt: now,
            },
          });

          if (claimed.count !== 1) {
            throw new Error("ADJUSTMENT_ALREADY_PROCESSED");
          }

          const wallet = await tx.wallet.findUnique({
            where: {
              accountId: adjustment.recipientAccountId,
            },
            select: {
              id: true,
              balance: true,
              reservedBalance: true,
            },
          });

          if (!wallet) {
            throw new Error("WALLET_NOT_FOUND");
          }

          const balanceBefore = new Prisma.Decimal(wallet.balance);
          const reservedBalance = new Prisma.Decimal(wallet.reservedBalance);
          const amount = new Prisma.Decimal(adjustment.amount);

          const balanceAfter =
            adjustment.direction === FinancialAdjustmentDirection.CREDIT
              ? balanceBefore.plus(amount)
              : balanceBefore.minus(amount);

          if (
            adjustment.direction === FinancialAdjustmentDirection.DEBIT &&
            balanceAfter.lt(reservedBalance)
          ) {
            throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");
          }

          if (balanceAfter.lt(0) || balanceAfter.gt(MAX_AMOUNT)) {
            throw new Error("INVALID_ADJUSTMENT_BALANCE");
          }

          // Guard against concurrent wallet updates by requiring the balance
          // read above to still match when applying the adjustment.
          const walletUpdate = await tx.wallet.updateMany({
            where: {
              id: wallet.id,
              balance: balanceBefore,
              ...(adjustment.direction === FinancialAdjustmentDirection.DEBIT
                ? {
                  reservedBalance: {
                    lte: balanceAfter,
                  },
                }
                : {}),
            },
            data: {
              balance: balanceAfter,
            },
          });

          if (walletUpdate.count !== 1) {
            throw new Error("WALLET_BALANCE_CHANGED_RETRY");
          }

          const signedAmount =
            adjustment.direction === FinancialAdjustmentDirection.CREDIT
              ? amount
              : amount.negated();

          const walletTransaction = await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: WalletTransactionType.ADJUSTMENT,
              amount: signedAmount,
              balanceBefore,
              balanceAfter,
              description: this.buildDescription(
                adjustment.direction,
                adjustment.reason,
                adjustment.note,
              ),
            },
          });

          await tx.financialAdjustment.update({
            where: {
              id: adjustment.id,
            },
            data: {
              walletTransactionId: walletTransaction.id,
            },
          });

          return {
            expired: false as const,
            adjustmentId: adjustment.id,
            walletTransactionId: walletTransaction.id,
          };
        });

        break;
      } catch (error) {
        const isBalanceConflict =
          error instanceof Error &&
          error.message === "WALLET_BALANCE_CHANGED_RETRY";

        if (!isBalanceConflict || attempt === maxAttempts) {
          throw error;
        }
      }
    }

    if (!result) {
      throw new Error("WALLET_BALANCE_CHANGED_RETRY");
    }

    // Throw after the transaction commits so EXPIRED remains persisted.
    if (result.expired) {
      throw new Error("ADJUSTMENT_EXPIRED");
    }

    return this.getAdjustment(normalizedCode);
  }
}

export const financialAdjustmentService =
  new FinancialAdjustmentService();
