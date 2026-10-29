import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import {
  AccountPlatform,
  BankAccountOwnerType,
  BankAccountStatus,
  PaymentInstructionStatus,
  PaymentInstructionType,
  PaymentMethod,
  PaymentStatus,
  WalletTransactionType,
  OrderStatus,
} from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { inventoryService } from "../inventory/inventory.service.js";
import { demoClockService } from "../demo-clock/demo-clock.service.js";

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

const PAYMENT_INSTRUCTION_VALIDITY_MS = 10 * 60 * 1000;

export interface ManualApproveInput {
  adminId: bigint | number;
  note?: string;
  bankTransactionId?: bigint | number;
}

export class PaymentInstructionService {
  // ============================================================
  // FIND ACTIVE SHOP BANK ACCOUNT
  // ============================================================

  private async findActiveShopBankAccount(
    tx?: PrismaTransactionClient,
  ) {
    const client = tx ?? prisma;

    const bankAccount = await client.bankAccount.findFirst({
      where: {
        ownerType: BankAccountOwnerType.SHOP,
        status: BankAccountStatus.ACTIVE,
      },
      orderBy: {
        id: "asc",
      },
    });

    if (!bankAccount) {
      throw new Error("SHOP_BANK_ACCOUNT_NOT_FOUND");
    }

    return bankAccount;
  }

  // ============================================================
  // CREATE ORDER PAYMENT INSTRUCTION
  // ============================================================

  async createOrderPaymentInstruction(
    orderId: bigint | number,
  ) {
    const orderIdBigInt = BigInt(orderId);

    const order = await prisma.order.findUnique({
      where: {
        id: orderIdBigInt,
      },
      select: {
        id: true,
        accountId: true,
        orderNumber: true,
        platform: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
        totalAmount: true,
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.platform !== AccountPlatform.MEMBER) {
      throw new Error("MEMBER_ACCOUNT_REQUIRED");
    }

    if (order.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
      throw new Error("BANK_TRANSFER_PAYMENT_REQUIRED");
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.RETURNED
    ) {
      throw new Error("ORDER_NOT_PAYABLE");
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new Error("ORDER_ALREADY_PAID");
    }

    const existingInstruction =
      await prisma.paymentInstruction.findFirst({
        where: {
          orderId: order.id,
          status: {
            in: [
              PaymentInstructionStatus.WAITING,
              PaymentInstructionStatus.PARTIALLY_PAID,
            ],
          },
        },
        orderBy: {
          id: "desc",
        },
      });

    if (existingInstruction) {
      throw new Error(
        "ACTIVE_PAYMENT_INSTRUCTION_ALREADY_EXISTS",
      );
    }

    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const shopBankAccount =
        await this.findActiveShopBankAccount(tx);

      return tx.paymentInstruction.create({
        data: {
          accountId: order.accountId,
          orderId: order.id,
          bankAccountId: shopBankAccount.id,
          type: PaymentInstructionType.ORDER_PAYMENT,
          status: PaymentInstructionStatus.WAITING,
          expectedAmount: order.totalAmount,
          receivedAmount: new Prisma.Decimal(0),
          transferContent: order.orderNumber,
          createdAt: now,
          expiresAt: new Date(
            now.getTime() +
            PAYMENT_INSTRUCTION_VALIDITY_MS,
          ),
        },
        include: {
          bankAccount: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              totalAmount: true,
              paymentStatus: true,
              paymentMethod: true,
              status: true,
            },
          },
        },
      });
    });
  }


  async getOrCreateOrderPaymentInstruction(
    orderId: bigint | number,
    accountId: bigint | number,
  ) {
    const orderIdBigInt = BigInt(orderId);
    const accountIdBigInt = BigInt(accountId);

    const order = await prisma.order.findUnique({
      where: {
        id: orderIdBigInt,
      },
      select: {
        id: true,
        accountId: true,
        platform: true,
        status: true,
        paymentStatus: true,
        paymentMethod: true,
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

    if (order.paymentMethod !== PaymentMethod.BANK_TRANSFER) {
      throw new Error("BANK_TRANSFER_PAYMENT_REQUIRED");
    }

    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.RETURNED
    ) {
      throw new Error("ORDER_NOT_PAYABLE");
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new Error("ORDER_ALREADY_PAID");
    }

    const existingInstruction =
      await prisma.paymentInstruction.findFirst({
        where: {
          orderId: order.id,
          accountId: accountIdBigInt,
          type: PaymentInstructionType.ORDER_PAYMENT,
          status: {
            in: [
              PaymentInstructionStatus.WAITING,
              PaymentInstructionStatus.PARTIALLY_PAID,
            ],
          },
        },
        orderBy: {
          id: "desc",
        },
      });

    if (existingInstruction) {
      if (
        existingInstruction.expiresAt.getTime() <=
        Date.now()
      ) {
        const expiredInstruction =
          await this.expireInstruction(
            existingInstruction.id,
          );

        if (
          expiredInstruction.status ===
          PaymentInstructionStatus.COMPLETED
        ) {
          throw new Error("ORDER_ALREADY_PAID");
        }

        throw new Error("ORDER_NOT_PAYABLE");
      }

      return this.getInstruction(
        existingInstruction.id,
      );
    }

    return this.createOrderPaymentInstruction(order.id);
  }


  // ============================================================
  // CREATE WALLET TOP-UP INSTRUCTION
  // ============================================================

  async createWalletTopUpInstruction(
    accountId: bigint | number,
    amount: Prisma.Decimal | number | string,
  ) {
    const accountIdBigInt = BigInt(accountId);
    const decimalAmount = new Prisma.Decimal(amount);

    if (
      !decimalAmount.isFinite() ||
      decimalAmount.lte(0)
    ) {
      throw new Error("INVALID_AMOUNT");
    }

    const account =
      await prisma.userAccount.findUnique({
        where: {
          id: accountIdBigInt,
        },
        select: {
          id: true,
          platform: true,
          status: true,
        },
      });

    if (!account) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    if (account.platform !== AccountPlatform.MEMBER) {
      throw new Error("MEMBER_ACCOUNT_REQUIRED");
    }

    if (account.status !== "ACTIVE") {
      throw new Error("ACCOUNT_NOT_ACTIVE");
    }

    const wallet = await prisma.wallet.findUnique({
      where: {
        accountId: accountIdBigInt,
      },
      select: {
        id: true,
      },
    });

    if (!wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }

    const now = new Date();

    return prisma.$transaction(async (tx) => {
      const shopBankAccount =
        await this.findActiveShopBankAccount(tx);

      let transferContent: string;

      for (let attempt = 0; attempt < 10; attempt++) {
        const randomPart = Math.random()
          .toString(36)
          .substring(2, 10)
          .toUpperCase();

        transferContent = `TOPUP-${randomPart}`;

        const existing =
          await tx.paymentInstruction.findFirst({
            where: {
              transferContent,
            },
          });

        if (!existing) {
          return tx.paymentInstruction.create({
            data: {
              accountId: accountIdBigInt,
              bankAccountId: shopBankAccount.id,
              type: PaymentInstructionType.WALLET_TOP_UP,
              status:
                PaymentInstructionStatus.WAITING,
              expectedAmount: decimalAmount,
              receivedAmount:
                new Prisma.Decimal(0),
              transferContent,
              createdAt: now,
              expiresAt: new Date(
                now.getTime() +
                PAYMENT_INSTRUCTION_VALIDITY_MS,
              ),
            },
            include: {
              bankAccount: true,
            },
          });
        }
      }

      throw new Error(
        "PAYMENT_INSTRUCTION_CONTENT_GENERATION_FAILED",
      );
    });
  }

  // ============================================================
  // PROCESS BANK TRANSACTION
  // ============================================================

  async processBankTransaction(
    bankTransactionId: bigint | number,
  ) {
    const transactionId = BigInt(
      bankTransactionId,
    );

    return prisma.$transaction(async (tx) => {
      // ----------------------------------------------------------
      // 1. LOAD BANK TRANSACTION
      // ----------------------------------------------------------

      const bankTransaction =
        await tx.bankTransaction.findUnique({
          where: {
            id: transactionId,
          },
        });

      if (!bankTransaction) {
        throw new Error(
          "BANK_TRANSACTION_NOT_FOUND",
        );
      }

      if (
        bankTransaction.type !==
        "TRANSFER"
      ) {
        throw new Error(
          "BANK_TRANSACTION_NOT_TRANSFER",
        );
      }

      if (!bankTransaction.description) {
        throw new Error(
          "BANK_TRANSACTION_CONTENT_REQUIRED",
        );
      }

      // ----------------------------------------------------------
      // 2. CHECK WHETHER THIS TRANSACTION WAS ALREADY CLAIMED
      // ----------------------------------------------------------

      if (
        bankTransaction.paymentInstructionId !==
        null
      ) {
        throw new Error(
          "BANK_TRANSACTION_ALREADY_PROCESSED",
        );
      }

      // ----------------------------------------------------------
      // 3. FIND PAYMENT INSTRUCTION BY TRANSFER CONTENT
      // ----------------------------------------------------------

      const instruction =
        await tx.paymentInstruction.findFirst({
          where: {
            transferContent:
              bankTransaction.description,
          },
          include: {
            order: {
              include: {
                items: {
                  select: {
                    variantId: true,
                    quantity: true,
                  },
                },
              },
            },
          },
          orderBy: {
            id: "desc",
          },
        });

      if (!instruction) {
        throw new Error(
          "PAYMENT_INSTRUCTION_NOT_FOUND",
        );
      }

      // ----------------------------------------------------------
      // 4. CHECK INSTRUCTION STATUS
      //
      // Only WAITING can receive a new automatic payment.
      //
      // IMPORTANT:
      // EXPIRED / CANCELLED / COMPLETED / OVERPAID /
      // MANUAL_APPROVED are NOT automatically processed.
      // ----------------------------------------------------------

      if (
        instruction.status !==
        PaymentInstructionStatus.WAITING
      ) {
        throw new Error(
          "PAYMENT_INSTRUCTION_NOT_ACTIVE",
        );
      }

      // ----------------------------------------------------------
      // 5. CHECK RECIPIENT
      // ----------------------------------------------------------

      if (
        bankTransaction.toBankAccountId !==
        instruction.bankAccountId
      ) {
        throw new Error(
          "BANK_TRANSACTION_RECIPIENT_MISMATCH",
        );
      }

      // ----------------------------------------------------------
      // 6. CHECK EXACT AMOUNT
      //
      // No:
      // - underpayment
      // - overpayment
      // - accumulation
      // - split payment
      //
      // Only EXACT amount is automatically processed.
      // ----------------------------------------------------------

      const transactionAmount =
        new Prisma.Decimal(
          bankTransaction.amount,
        );

      const expectedAmount =
        new Prisma.Decimal(
          instruction.expectedAmount,
        );

      if (
        !transactionAmount.equals(
          expectedAmount,
        )
      ) {
        throw new Error(
          "BANK_TRANSACTION_AMOUNT_MISMATCH",
        );
      }

      // ----------------------------------------------------------
      // 7. CHECK TIMING
      //
      // Transaction must be created no later than expiresAt.
      // ----------------------------------------------------------

      if (
        bankTransaction.createdAt.getTime() >
        instruction.expiresAt.getTime()
      ) {
        throw new Error(
          "BANK_TRANSACTION_AFTER_EXPIRY",
        );
      }

      // ----------------------------------------------------------
      // 8. ORDER PAYMENT
      // ----------------------------------------------------------

      if (
        instruction.type ===
        PaymentInstructionType.ORDER_PAYMENT
      ) {
        const order = instruction.order;

        if (!order) {
          throw new Error(
            "ORDER_NOT_FOUND",
          );
        }

        // --------------------------------------------------------
        // CANCELLED ORDER
        //
        // Never revive a cancelled Order.
        // Even an otherwise exact transaction is NOT automatically
        // processed.
        //
        // Customer complaint -> Admin reconciliation ->
        // Financial Adjustment to Wallet.
        // --------------------------------------------------------

        if (
          order.status ===
          OrderStatus.CANCELLED
        ) {
          throw new Error(
            "ORDER_CANCELLED",
          );
        }

        // --------------------------------------------------------
        // ALREADY PAID
        // --------------------------------------------------------

        if (
          order.paymentStatus ===
          PaymentStatus.PAID
        ) {
          throw new Error(
            "ORDER_ALREADY_PAID",
          );
        }

        // --------------------------------------------------------
        // VALIDATE ORDER BEFORE CLAIMING BANK TRANSACTION
        // --------------------------------------------------------

        if (
          order.paymentMethod !==
          "BANK_TRANSFER"
        ) {
          throw new Error(
            "ORDER_PAYMENT_METHOD_MISMATCH",
          );
        }

        if (
          order.status !== OrderStatus.PENDING &&
          order.status !== OrderStatus.CONFIRMED
        ) {
          throw new Error(
            "ORDER_NOT_PAYABLE",
          );
        }

        // --------------------------------------------------------
        // CLAIM BANK TRANSACTION
        // --------------------------------------------------------

        const claimedBankTransaction =
          await tx.bankTransaction.updateMany({
            where: {
              id: bankTransaction.id,
              paymentInstructionId: null,
            },
            data: {
              paymentInstructionId:
                instruction.id,
            },
          });

        if (
          claimedBankTransaction.count !== 1
        ) {
          throw new Error(
            "BANK_TRANSACTION_ALREADY_PROCESSED",
          );
        }

        // --------------------------------------------------------
        // CONFIRMED + PAID
        // --------------------------------------------------------

        const confirmedOrder =
          await tx.order.updateMany({
            where: {
              id: order.id,
              status: order.status,
              paymentStatus: PaymentStatus.UNPAID,
              paymentMethod: "BANK_TRANSFER",
            },
            data: {
              status: OrderStatus.CONFIRMED,
              paymentStatus: PaymentStatus.PAID,
            },
          });

        if (confirmedOrder.count !== 1) {
          throw new Error(
            "ORDER_STATE_CHANGED",
          );
        }

        // --------------------------------------------------------
        // PROCESSING + PAID
        // --------------------------------------------------------

        const processingAt =
          await demoClockService.getNow();

        const processingOrder =
          await tx.order.updateMany({
            where: {
              id: order.id,
              status: OrderStatus.CONFIRMED,
              paymentStatus: PaymentStatus.PAID,
              paymentMethod: "BANK_TRANSFER",
            },
            data: {
              status: OrderStatus.PROCESSING,
              processingAt,
            },
          });

        if (processingOrder.count !== 1) {
          throw new Error(
            "ORDER_PROCESSING_FAILED",
          );
        }
        return tx.paymentInstruction.update({
          where: {
            id: instruction.id,
          },
          data: {
            receivedAmount:
              transactionAmount,
            status:
              PaymentInstructionStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }

      // ----------------------------------------------------------
      // 9. WALLET TOP-UP
      // ----------------------------------------------------------

      if (
        instruction.type ===
        PaymentInstructionType.WALLET_TOP_UP
      ) {
        const wallet =
          await tx.wallet.findUnique({
            where: {
              accountId:
                instruction.accountId,
            },
          });

        if (!wallet) {
          throw new Error(
            "WALLET_NOT_FOUND",
          );
        }

        // --------------------------------------------------------
        // CLAIM BANK TRANSACTION
        //
        // All validation has passed:
        // - content matched
        // - recipient matched
        // - exact amount matched
        // - timing matched
        // - instruction WAITING
        //
        // Only now claim it.
        // --------------------------------------------------------

        const claimedBankTransaction =
          await tx.bankTransaction.updateMany({
            where: {
              id: bankTransaction.id,
              paymentInstructionId: null,
            },
            data: {
              paymentInstructionId:
                instruction.id,
            },
          });

        if (
          claimedBankTransaction.count !== 1
        ) {
          throw new Error(
            "BANK_TRANSACTION_ALREADY_PROCESSED",
          );
        }

        // --------------------------------------------------------
        // CREDIT EXACT AMOUNT
        // --------------------------------------------------------

        const balanceBefore =
          new Prisma.Decimal(
            wallet.balance,
          );

        const balanceAfter =
          balanceBefore.add(
            transactionAmount,
          );

        await tx.wallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            balance: balanceAfter,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type:
              WalletTransactionType.TOP_UP,
            amount:
              transactionAmount,
            balanceBefore,
            balanceAfter,
            description:
              `DuckBank top-up ${instruction.transferContent}`,
          },
        });

        return tx.paymentInstruction.update({
          where: {
            id: instruction.id,
          },
          data: {
            receivedAmount:
              transactionAmount,
            status:
              PaymentInstructionStatus.COMPLETED,
            completedAt: new Date(),
          },
        });
      }

      throw new Error(
        "UNSUPPORTED_PAYMENT_INSTRUCTION_TYPE",
      );
    });
  }

  // ============================================================
  // EXPIRE INSTRUCTION
  //
  // ORDER_PAYMENT:
  // EXPIRED → CANCEL ORDER → RELEASE STOCK
  // Nếu đã nhận tiền → hoàn tiền vào Wallet
  //
  // WALLET_TOP_UP:
  // EXPIRED only
  // ============================================================

  async expireInstruction(
    paymentInstructionId: bigint | number,
  ) {
    const instructionId = BigInt(
      paymentInstructionId,
    );

    return prisma.$transaction(async (tx) => {
      const instruction =
        await tx.paymentInstruction.findUnique({
          where: {
            id: instructionId,
          },
          include: {
            order: {
              include: {
                items: {
                  select: {
                    variantId: true,
                    quantity: true,
                  },
                },
              },
            },
          },
        });

      if (!instruction) {
        throw new Error(
          "PAYMENT_INSTRUCTION_NOT_FOUND",
        );
      }

      if (
        instruction.status ===
        PaymentInstructionStatus.COMPLETED ||
        instruction.status ===
        PaymentInstructionStatus.OVERPAID ||
        instruction.status ===
        PaymentInstructionStatus.MANUAL_APPROVED ||
        instruction.status ===
        PaymentInstructionStatus.CANCELLED
      ) {
        throw new Error(
          "PAYMENT_INSTRUCTION_NOT_EXPIRABLE",
        );
      }

      if (
        new Date() <
        instruction.expiresAt
      ) {
        throw new Error(
          "PAYMENT_INSTRUCTION_NOT_EXPIRED",
        );
      }

      // ========================================================
      // ORDER PAYMENT
      // ========================================================

      if (
        instruction.type ===
        PaymentInstructionType.ORDER_PAYMENT
      ) {
        const order =
          instruction.order;

        if (!order) {
          throw new Error(
            "ORDER_NOT_FOUND",
          );
        }

        /*
         * Nếu Order đã PAID trong lúc instruction
         * đang chờ expiry thì không được cancel.
         */
        if (
          order.paymentStatus ===
          PaymentStatus.PAID
        ) {
          return tx.paymentInstruction.update({
            where: {
              id: instruction.id,
            },
            data: {
              status:
                PaymentInstructionStatus.COMPLETED,
              completedAt: new Date(),
            },
          });
        }

        /*
         * Nếu Order đã CANCELLED thì chỉ cần đánh dấu EXPIRED.
         *
         * Không hoàn tiền ở đây lần nữa vì khoản tiền của
         * Order đã CANCELLED phải được xử lý khi giao dịch
         * thực tế được nhận.
         */
        if (
          order.status ===
          OrderStatus.CANCELLED
        ) {
          return tx.paymentInstruction.update({
            where: {
              id: instruction.id,
            },
            data: {
              status:
                PaymentInstructionStatus.EXPIRED,
            },
          });
        }

        // ------------------------------------------------------
        // RELEASE RESERVED STOCK
        // ------------------------------------------------------

        for (const item of order.items) {
          await inventoryService.releaseStockInTransaction(
            tx,
            item.variantId,
            item.quantity,
          );
        }

        await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            status:
              OrderStatus.CANCELLED,
          },
        });


        // CANCEL OTHER ACTIVE PAYMENT INSTRUCTIONS
        // The current instruction will be marked EXPIRED below.
        // Other active instructions for the same Order must not
        // remain payable after the Order is cancelled.
        await tx.paymentInstruction.updateMany({
          where: {
            orderId: order.id,
            id: {
              not: instruction.id,
            },
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


        // ------------------------------------------------------
        // REFUND PARTIAL PAYMENT TO WALLET
        //
        // Nếu đã nhận một phần tiền trước expiry,
        // khoản tiền đó không được mất khi Order bị cancel.
        // ------------------------------------------------------

        const receivedAmount =
          new Prisma.Decimal(
            instruction.receivedAmount,
          );

        if (receivedAmount.gt(0)) {
          const wallet =
            await tx.wallet.findUnique({
              where: {
                accountId:
                  instruction.accountId,
              },
            });

          if (!wallet) {
            throw new Error(
              "WALLET_NOT_FOUND",
            );
          }

          const balanceBefore =
            new Prisma.Decimal(
              wallet.balance,
            );

          const balanceAfter =
            balanceBefore.add(
              receivedAmount,
            );

          await tx.wallet.update({
            where: {
              id: wallet.id,
            },
            data: {
              balance: balanceAfter,
            },
          });

          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type:
                WalletTransactionType.TOP_UP,
              amount: receivedAmount,
              balanceBefore,
              balanceAfter,
              description:
                `Expired order payment refund for order ${order.orderNumber}`,
            },
          });
        }

        return tx.paymentInstruction.update({
          where: {
            id: instruction.id,
          },
          data: {
            status:
              PaymentInstructionStatus.EXPIRED,
          },
        });
      }

      // ========================================================
      // WALLET TOP-UP
      // ========================================================

      return tx.paymentInstruction.update({
        where: {
          id: instruction.id,
        },
        data: {
          status:
            PaymentInstructionStatus.EXPIRED,
        },
      });
    });
  }

  // ============================================================
  // MANUAL APPROVE
  //
  // PI1 = A:
  // bankTransactionId KHÔNG bắt buộc.
  //
  // PI2 = A:
  // EXPIRED vẫn có thể được ADMIN manual approve.
  //
  // Có BankTransaction:
  //   - Xác nhận giao dịch thực tế.
  //
  // Không có BankTransaction:
  //   - ADMIN manual override.
  //   - Không tạo BankTransaction giả.
  // ============================================================

  async manualApprove(
    paymentInstructionId: bigint | number,
    input: ManualApproveInput,
  ) {
    const instructionId = BigInt(
      paymentInstructionId,
    );

    const adminId = BigInt(
      input.adminId,
    );

    if (
      input.bankTransactionId ===
      undefined
    ) {
      throw new Error(
        "BANK_TRANSACTION_REQUIRED",
      );
    }

    const bankTransactionId =
      BigInt(
        input.bankTransactionId,
      );

    return prisma.$transaction(async (tx) => {
      // ========================================================
      // 1. LOAD PAYMENT INSTRUCTION
      // ========================================================

      const instruction =
        await tx.paymentInstruction.findUnique({
          where: {
            id: instructionId,
          },
          include: {
            order: true,
          },
        });

      if (!instruction) {
        throw new Error(
          "PAYMENT_INSTRUCTION_NOT_FOUND",
        );
      }

      // ========================================================
      // 2. ADMIN MUST EXIST
      // ========================================================

      const admin =
        await tx.adminAccount.findUnique({
          where: {
            id: adminId,
          },
          select: {
            id: true,
          },
        });

      if (!admin) {
        throw new Error(
          "ADMIN_NOT_FOUND",
        );
      }

      // ========================================================
      // 3. ONLY WAITING INSTRUCTION CAN BE MANUALLY APPROVED
      //
      // COMPLETED / OVERPAID / MANUAL_APPROVED / EXPIRED /
      // PARTIALLY_PAID are not valid manual-approval targets.
      // ========================================================

      if (
        instruction.status !==
        PaymentInstructionStatus.WAITING
      ) {
        throw new Error(
          "PAYMENT_INSTRUCTION_NOT_ACTIVE",
        );
      }

      // ========================================================
      // 4. BANK TRANSACTION IS REQUIRED
      // ========================================================

      const bankTransaction =
        await tx.bankTransaction.findUnique({
          where: {
            id: bankTransactionId,
          },
        });

      if (!bankTransaction) {
        throw new Error(
          "BANK_TRANSACTION_NOT_FOUND",
        );
      }

      // ========================================================
      // 5. TRANSACTION MUST BE A TRANSFER
      // ========================================================

      if (
        String(
          bankTransaction.type,
        ) !== "TRANSFER"
      ) {
        throw new Error(
          "BANK_TRANSACTION_TYPE_INVALID",
        );
      }

      // ========================================================
      // 6. TRANSACTION MUST NOT ALREADY BE CLAIMED
      // ========================================================

      if (
        bankTransaction.paymentInstructionId !==
        null &&
        bankTransaction.paymentInstructionId !==
        instruction.id
      ) {
        throw new Error(
          "BANK_TRANSACTION_ALREADY_PROCESSED",
        );
      }

      if (
        bankTransaction.paymentInstructionId ===
        instruction.id
      ) {
        throw new Error(
          "BANK_TRANSACTION_ALREADY_PROCESSED",
        );
      }

      // ========================================================
      // 7. TRANSFER CONTENT MUST MATCH
      // ========================================================

      if (
        !bankTransaction.description ||
        bankTransaction.description.trim() !==
        instruction.transferContent
      ) {
        throw new Error(
          "PAYMENT_INSTRUCTION_NOT_FOUND",
        );
      }

      // ========================================================
      // 8. RECIPIENT MUST MATCH SHOP BANK ACCOUNT
      // ========================================================

      if (
        bankTransaction.toBankAccountId !==
        instruction.bankAccountId
      ) {
        throw new Error(
          "BANK_TRANSACTION_RECIPIENT_MISMATCH",
        );
      }

      // ========================================================
      // 9. EXACT AMOUNT REQUIRED
      //
      // No partial accumulation.
      // No overpayment.
      // No supplemental payment.
      // ========================================================

      const actualAmount =
        new Prisma.Decimal(
          bankTransaction.amount,
        );

      const expectedAmount =
        new Prisma.Decimal(
          instruction.expectedAmount,
        );

      if (
        !actualAmount.equals(
          expectedAmount,
        )
      ) {
        throw new Error(
          "BANK_TRANSACTION_AMOUNT_MISMATCH",
        );
      }

      // ========================================================
      // 10. TRANSACTION MUST NOT BE LATE
      // ========================================================

      if (
        bankTransaction.createdAt >
        instruction.expiresAt
      ) {
        throw new Error(
          "BANK_TRANSACTION_AFTER_EXPIRY",
        );
      }

      // ========================================================
      // 11. ORDER-SPECIFIC VALIDATION
      // ========================================================

      if (
        instruction.type ===
        PaymentInstructionType.ORDER_PAYMENT
      ) {
        const order =
          instruction.order;

        if (!order) {
          throw new Error(
            "ORDER_NOT_FOUND",
          );
        }

        // ------------------------------------------------------
        // CANCELLED ORDER MUST NOT BE REVIVED
        // ------------------------------------------------------

        if (
          order.status ===
          OrderStatus.CANCELLED
        ) {
          throw new Error(
            "ORDER_CANCELLED",
          );
        }

        // ------------------------------------------------------
        // ALREADY PAID
        // ------------------------------------------------------

        if (
          order.paymentStatus ===
          PaymentStatus.PAID
        ) {
          throw new Error(
            "ORDER_ALREADY_PAID",
          );
        }

        // ======================================================
        // 12. CLAIM BANK TRANSACTION
        //
        // Conditional update prevents two Admin requests from
        // processing the same transaction concurrently.
        // ======================================================

        const claimed =
          await tx.bankTransaction.updateMany({
            where: {
              id: bankTransaction.id,
              paymentInstructionId: null,
            },
            data: {
              paymentInstructionId:
                instruction.id,
            },
          });

        if (
          claimed.count !== 1
        ) {
          throw new Error(
            "BANK_TRANSACTION_ALREADY_PROCESSED",
          );
        }

        // ======================================================
        // 13. MARK ORDER PAID
        // ======================================================

        await tx.order.update({
          where: {
            id: order.id,
          },
          data: {
            paymentStatus:
              PaymentStatus.PAID,
          },
        });

        // ======================================================
        // 14. COMPLETE PAYMENT INSTRUCTION
        // ======================================================

        return tx.paymentInstruction.update({
          where: {
            id: instruction.id,
          },
          data: {
            receivedAmount:
              actualAmount,
            status:
              PaymentInstructionStatus.MANUAL_APPROVED,
            completedAt: new Date(),
            processedByAdminId:
              admin.id,
            adminNote: input.note,
          },
        });
      }

      // ========================================================
      // 15. WALLET TOP-UP
      // ========================================================

      if (
        instruction.type ===
        PaymentInstructionType.WALLET_TOP_UP
      ) {
        const wallet =
          await tx.wallet.findUnique({
            where: {
              accountId:
                instruction.accountId,
            },
          });

        if (!wallet) {
          throw new Error(
            "WALLET_NOT_FOUND",
          );
        }

        // ======================================================
        // CLAIM BANK TRANSACTION
        // ======================================================

        const claimed =
          await tx.bankTransaction.updateMany({
            where: {
              id: bankTransaction.id,
              paymentInstructionId: null,
            },
            data: {
              paymentInstructionId:
                instruction.id,
            },
          });

        if (
          claimed.count !== 1
        ) {
          throw new Error(
            "BANK_TRANSACTION_ALREADY_PROCESSED",
          );
        }

        // ======================================================
        // CREDIT EXACT VERIFIED AMOUNT
        // ======================================================

        const balanceBefore =
          new Prisma.Decimal(
            wallet.balance,
          );

        const balanceAfter =
          balanceBefore.add(
            actualAmount,
          );

        await tx.wallet.update({
          where: {
            id: wallet.id,
          },
          data: {
            balance:
              balanceAfter,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type:
              WalletTransactionType.TOP_UP,
            amount:
              actualAmount,
            balanceBefore,
            balanceAfter,
            description:
              input.note ??
              `Manual wallet top-up ${instruction.transferContent}`,
          },
        });

        // ======================================================
        // COMPLETE PAYMENT INSTRUCTION
        // ======================================================

        return tx.paymentInstruction.update({
          where: {
            id: instruction.id,
          },
          data: {
            receivedAmount:
              actualAmount,
            status:
              PaymentInstructionStatus.MANUAL_APPROVED,
            completedAt: new Date(),
            processedByAdminId:
              admin.id,
            adminNote: input.note,
          },
        });
      }

      // ========================================================
      // 16. UNSUPPORTED PAYMENT INSTRUCTION TYPE
      // ========================================================

      throw new Error(
        "PAYMENT_INSTRUCTION_TYPE_UNSUPPORTED",
      );
    });
  }

  // ============================================================
  // GET INSTRUCTION
  // ============================================================

  async getInstruction(
    paymentInstructionId: bigint | number,
  ) {
    const instruction =
      await prisma.paymentInstruction.findUnique({
        where: {
          id: BigInt(paymentInstructionId),
        },
        include: {
          bankAccount: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              paymentStatus: true,
              paymentMethod: true,
              totalAmount: true,
            },
          },
          bankTransactions: {
            orderBy: {
              createdAt: "asc",
            },
          },
          processedByAdmin: {
            select: {
              id: true,
            },
          },
        },
      });

    if (!instruction) {
      throw new Error(
        "PAYMENT_INSTRUCTION_NOT_FOUND",
      );
    }

    return instruction;
  }
}

export const paymentInstructionService =
  new PaymentInstructionService();