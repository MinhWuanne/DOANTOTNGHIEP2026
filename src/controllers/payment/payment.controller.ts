import { PaymentStatus } from "../../generated/prisma/enums.js";
import { paymentService } from "../../services/payment/payment.service.js";

import {
  paymentInstructionService,
} from "../../services/payment/payment-instruction.service.js";
export interface UpdatePaymentStatusRequest {
  status: PaymentStatus;
}

import { prisma } from "../../lib/prisma.js";
import {
  BankAccountOwnerType,
  BankAccountStatus,
  BankTransactionType,
} from "../../generated/prisma/enums.js";

function parsePaymentId(id: string | number): bigint {
  if (
    typeof id !== "string" &&
    typeof id !== "number"
  ) {
    throw new Error("INVALID_PAYMENT_ID");
  }

  const value = String(id).trim();

  if (!/^\d+$/.test(value) || value === "0") {
    throw new Error("INVALID_PAYMENT_ID");
  }

  try {
    return BigInt(value);
  } catch {
    throw new Error("INVALID_PAYMENT_ID");
  }
}

export class PaymentController {
  async getOrderPayment(id: string | number) {
    return paymentService.getOrderPayment(
      parsePaymentId(id),
    );
  }


  async getOrCreateOrderPaymentInstruction(
    orderId: string | number,
    accountId: string | number,
  ) {
    const instruction =
      await paymentInstructionService
        .getOrCreateOrderPaymentInstruction(
          parsePaymentId(orderId),
          parsePaymentId(accountId),
        );

    return {
      id: String(instruction.id),
      type: instruction.type,
      status: instruction.status,
      expectedAmount: String(instruction.expectedAmount),
      receivedAmount: String(instruction.receivedAmount),
      transferContent: instruction.transferContent,
      createdAt: instruction.createdAt,
      expiresAt: instruction.expiresAt,
      bankAccount: instruction.bankAccount
        ? {
          accountNumber:
            instruction.bankAccount.accountNumber,
        }
        : null,
      order: instruction.order
        ? {
          id: String(instruction.order.id),
          orderNumber: instruction.order.orderNumber,
          status: instruction.order.status,
          paymentStatus:
            instruction.order.paymentStatus,
          paymentMethod:
            instruction.order.paymentMethod,
          totalAmount: String(
            instruction.order.totalAmount,
          ),
        }
        : null,
    };
  }

  async createWalletTopUpInstruction(
    accountId: string | number,
    amount: string | number,
  ) {
    const instruction =
      await paymentInstructionService
        .createWalletTopUpInstruction(
          parsePaymentId(accountId),
          amount,
        );

    return {
      id: String(instruction.id),
      type: instruction.type,
      status: instruction.status,
      expectedAmount: String(instruction.expectedAmount),
      receivedAmount: String(instruction.receivedAmount),
      transferContent: instruction.transferContent,
      createdAt: instruction.createdAt,
      expiresAt: instruction.expiresAt,
      bankAccount: instruction.bankAccount
        ? {
          accountNumber:
            instruction.bankAccount.accountNumber,
        }
        : null,
    };
  }

  async listPendingBankTransactions() {
    const shopBankAccount =
      await prisma.bankAccount.findFirst({
        where: {
          ownerType: BankAccountOwnerType.SHOP,
          status: BankAccountStatus.ACTIVE,
        },
        orderBy: {
          id: "asc",
        },
        select: {
          id: true,
          accountNumber: true,
        },
      });

    if (!shopBankAccount) {
      throw new Error("SHOP_BANK_ACCOUNT_NOT_FOUND");
    }

    const transactions =
      await prisma.bankTransaction.findMany({
        where: {
          type: BankTransactionType.TRANSFER,
          toBankAccountId: shopBankAccount.id,
          paymentInstructionId: null,
        },
        include: {
          fromBankAccount: {
            select: {
              id: true,
              accountNumber: true,
            },
          },
          toBankAccount: {
            select: {
              id: true,
              accountNumber: true,
            },
          },
        },
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: 100,
      });

    return transactions.map((transaction) => ({
      id: transaction.id.toString(),
      type: transaction.type,
      amount: transaction.amount.toString(),
      description: transaction.description,
      createdAt: transaction.createdAt,
      paymentInstructionId:
        transaction.paymentInstructionId?.toString() ?? null,
      fromBankAccount: transaction.fromBankAccount
        ? {
          id: transaction.fromBankAccount.id.toString(),
          accountNumber:
            transaction.fromBankAccount.accountNumber,
        }
        : null,
      toBankAccount: transaction.toBankAccount
        ? {
          id: transaction.toBankAccount.id.toString(),
          accountNumber:
            transaction.toBankAccount.accountNumber,
        }
        : null,
    }));
  }

  async processBankTransaction(id: string | number) {
    return paymentInstructionService.processBankTransaction(
      parsePaymentId(id),
    );
  }


  async updatePaymentStatus(
    id: string | number,
    input: UpdatePaymentStatusRequest,
  ) {
    return paymentService.updatePaymentStatus(
      parsePaymentId(id),
      input.status,
    );
  }
}

export const paymentController = new PaymentController();