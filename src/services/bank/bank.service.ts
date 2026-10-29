import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import {
  BankAccountOwnerType,
  BankAccountStatus,
  BankTransactionType,
} from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";

import { paymentInstructionService } from "../payment/payment-instruction.service.js";

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

export class BankService {
  async createAccount(
    ownerType: BankAccountOwnerType,
    ownerAccountId?: bigint | number,
  ) {
    const accountNumber = `DUCKBANK-${Date.now()}-${Math.floor(
      Math.random() * 100000,
    )}`;

    const existing = ownerAccountId
      ? await prisma.bankAccount.findUnique({
        where: {
          ownerAccountId: BigInt(ownerAccountId),
        },
      })
      : null;

    if (existing) {
      throw new Error("BANK_ACCOUNT_ALREADY_EXISTS");
    }

    return prisma.bankAccount.create({
      data: {
        accountNumber,
        ownerType,
        ownerAccountId:
          ownerAccountId !== undefined
            ? BigInt(ownerAccountId)
            : null,
        balance: 0,
        status: BankAccountStatus.ACTIVE,
      },
    });
  }

  async getAccount(id: bigint | number) {
    const accountId = BigInt(id);

    const account = await prisma.bankAccount.findUnique({
      where: {
        id: accountId,
      },
    });

    if (!account) {
      throw new Error("BANK_ACCOUNT_NOT_FOUND");
    }

    return account;
  }

  async getBalance(id: bigint | number) {
    const account = await this.getAccount(id);

    return account.balance;
  }

  async listAccounts() {
    return prisma.bankAccount.findMany({
      select: {
        id: true,
        accountNumber: true,
        ownerAccountId: true,
        ownerType: true,
        balance: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        id: "asc",
      },
    });
  }

  async listTransactions(accountId?: bigint | number) {
    const where = accountId !== undefined
      ? {
        OR: [
          { fromBankAccountId: BigInt(accountId) },
          { toBankAccountId: BigInt(accountId) },
        ],
      }
      : {};

    if (accountId !== undefined) {
      const account = await prisma.bankAccount.findUnique({
        where: {
          id: BigInt(accountId),
        },
        select: {
          id: true,
        },
      });

      if (!account) {
        throw new Error("BANK_ACCOUNT_NOT_FOUND");
      }
    }

    return prisma.bankTransaction.findMany({
      where,
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
  }

  async deposit(
    id: bigint | number,
    amount: number,
    description?: string,
  ) {
    const accountId = BigInt(id);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("INVALID_AMOUNT");
    }

    const account = await prisma.bankAccount.findUnique({
      where: {
        id: accountId,
      },
    });

    if (!account) {
      throw new Error("BANK_ACCOUNT_NOT_FOUND");
    }

    if (account.status !== BankAccountStatus.ACTIVE) {
      throw new Error("BANK_ACCOUNT_NOT_ACTIVE");
    }

    return prisma.$transaction(async (tx) => {
      const updatedAccount = await tx.bankAccount.update({
        where: {
          id: accountId,
        },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      await tx.bankTransaction.create({
        data: {
          toBankAccountId: accountId,
          type: BankTransactionType.DEPOSIT,
          amount,
          description,
        },
      });

      return updatedAccount;
    });
  }

  async transferInTransaction(
    tx: PrismaTransactionClient,
    fromId: bigint | number,
    toId: bigint | number,
    amount: number,
    description?: string,
  ) {
    const fromBankAccountId = BigInt(fromId);
    const toBankAccountId = BigInt(toId);

    if (fromBankAccountId === toBankAccountId) {
      throw new Error("BANK_SELF_TRANSFER_NOT_ALLOWED");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("INVALID_AMOUNT");
    }

    const fromAccount = await tx.bankAccount.findUnique({
      where: {
        id: fromBankAccountId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    const toAccount = await tx.bankAccount.findUnique({
      where: {
        id: toBankAccountId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!fromAccount) {
      throw new Error("BANK_ACCOUNT_NOT_FOUND");
    }

    if (!toAccount) {
      throw new Error("BANK_ACCOUNT_NOT_FOUND");
    }

    if (
      fromAccount.status !== BankAccountStatus.ACTIVE ||
      toAccount.status !== BankAccountStatus.ACTIVE
    ) {
      throw new Error("BANK_ACCOUNT_NOT_ACTIVE");
    }

    /*
    * Atomic balance check + deduction.
    *
    * The important part is that the condition
    * "balance >= amount" is evaluated by the database
    * at the same time as the decrement.
    *
    * This prevents two concurrent transfers from
    * spending the same available balance.
    */
    const deducted = await tx.bankAccount.updateMany({
      where: {
        id: fromBankAccountId,
        status: BankAccountStatus.ACTIVE,
        balance: {
          gte: amount,
        },
      },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    if (deducted.count !== 1) {
      throw new Error("INSUFFICIENT_BANK_BALANCE");
    }

    await tx.bankAccount.update({
      where: {
        id: toBankAccountId,
      },
      data: {
        balance: {
          increment: amount,
        },
      },
    });

    const transaction = await tx.bankTransaction.create({
      data: {
        fromBankAccountId,
        toBankAccountId,
        type: BankTransactionType.TRANSFER,
        amount,
        description,
      },
    });

    return transaction;
  }

  async transfer(
    fromId: bigint | number,
    toId: bigint | number,
    amount: number,
    description?: string,
  ) {
    // Complete the bank transfer first.
    const transaction = await prisma.$transaction(async (tx) => {
      return this.transferInTransaction(
        tx,
        fromId,
        toId,
        amount,
        description,
      );
    });

    // Reconcile only after the bank transfer has committed.
    // A reconciliation failure must not make a completed transfer
    // appear to have failed.
    try {
      await paymentInstructionService.processBankTransaction(
        transaction.id,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      console.warn(
        `[BankService] Auto reconciliation skipped for transaction ${transaction.id}: ${message}`,
      );
    }

    return transaction;
  }
}

export const bankService = new BankService();