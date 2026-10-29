import { Prisma } from "../../generated/prisma/client.js";
import {
  BankAccountOwnerType,
  BankAccountStatus,
  WalletTransactionType,
  WithdrawalStatus,
} from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { bankService } from "../bank/bank.service.js";

export class WithdrawalService {
  async approveWithdrawal(withdrawalId: bigint | number) {
    const id = BigInt(withdrawalId);

    return prisma.$transaction(async (tx) => {
      const withdrawal = await tx.withdrawalRequest.findUnique({
        where: { id },
      });

      if (!withdrawal) {
        throw new Error("WITHDRAWAL_NOT_FOUND");
      }

      const updated =
        await tx.withdrawalRequest.updateMany({
          where: {
            id,
            status: WithdrawalStatus.PENDING,
          },
          data: {
            status: WithdrawalStatus.APPROVED,
          },
        });

      if (updated.count !== 1) {
        throw new Error(
          "INVALID_WITHDRAWAL_STATUS_TRANSITION",
        );
      }

      return tx.withdrawalRequest.findUniqueOrThrow({
        where: { id },
      });
    });
  }

  async rejectWithdrawal(
    withdrawalId: bigint | number,
    note?: string,
  ) {
    const id = BigInt(withdrawalId);

    return prisma.$transaction(async (tx) => {
      const withdrawal =
        await tx.withdrawalRequest.findUnique({
          where: { id },
        });

      if (!withdrawal) {
        throw new Error("WITHDRAWAL_NOT_FOUND");
      }

      const updated =
        await tx.withdrawalRequest.updateMany({
          where: {
            id,
            status: WithdrawalStatus.PENDING,
          },
          data: {
            status: WithdrawalStatus.REJECTED,
            note: note ?? withdrawal.note,
          },
        });

      if (updated.count !== 1) {
        throw new Error(
          "INVALID_WITHDRAWAL_STATUS_TRANSITION",
        );
      }

      /*
       * Release the amount reserved for this withdrawal.
       *
       * PENDING  -> reservedBalance += amount
       * REJECTED -> reservedBalance -= amount
       *
       * This update is atomic so reservedBalance
       * can never become negative.
       */
      const released =
        await tx.wallet.updateMany({
          where: {
            id: withdrawal.walletId,
            reservedBalance: {
              gte: withdrawal.amount,
            },
          },
          data: {
            reservedBalance: {
              decrement: withdrawal.amount,
            },
          },
        });

      if (released.count !== 1) {
        throw new Error(
          "INVALID_WALLET_RESERVED_BALANCE",
        );
      }

      return tx.withdrawalRequest.findUniqueOrThrow({
        where: { id },
      });
    });
  }


  async completeWithdrawal(withdrawalId: bigint | number) {
    const id = BigInt(withdrawalId);

    return prisma.$transaction(async (tx) => {
      const withdrawal =
        await tx.withdrawalRequest.findUnique({
          where: { id },
          include: {
            wallet: true,
            bankAccount: true,
          },
        });

      if (!withdrawal) {
        throw new Error("WITHDRAWAL_NOT_FOUND");
      }

      if (withdrawal.status !== WithdrawalStatus.APPROVED) {
        throw new Error(
          "INVALID_WITHDRAWAL_STATUS_TRANSITION",
        );
      }

      /*
       * Claim withdrawal atomically.
       *
       * Chỉ transaction nào chuyển được:
       *
       * APPROVED -> COMPLETED
       *
       * mới được quyền tiếp tục payout.
       *
       * Nếu request khác đã claim trước,
       * updated.count = 0 và transaction này bị từ chối.
       */
      const claimed =
        await tx.withdrawalRequest.updateMany({
          where: {
            id,
            status: WithdrawalStatus.APPROVED,
          },
          data: {
            status: WithdrawalStatus.COMPLETED,
          },
        });

      if (claimed.count !== 1) {
        throw new Error(
          "INVALID_WITHDRAWAL_STATUS_TRANSITION",
        );
      }

      if (!withdrawal.bankAccount) {
        throw new Error("BANK_ACCOUNT_NOT_FOUND");
      }

      if (
        withdrawal.bankAccount.ownerType !==
        BankAccountOwnerType.USER
      ) {
        throw new Error("INVALID_BANK_ACCOUNT_OWNER");
      }

      if (
        withdrawal.bankAccount.ownerType !==
        BankAccountOwnerType.USER
      ) {
        throw new Error("INVALID_BANK_ACCOUNT_OWNER");
      }

      if (
        withdrawal.bankAccount.status !==
        BankAccountStatus.ACTIVE
      ) {
        throw new Error("BANK_ACCOUNT_NOT_ACTIVE");
      }

      if (withdrawal.bankAccount.ownerAccountId === null) {
        throw new Error("BANK_ACCOUNT_NOT_BELONG_TO_ACCOUNT");
      }

      const [walletOwnerAccount, bankOwnerAccount] =
        await Promise.all([
          tx.userAccount.findUnique({
            where: {
              id: withdrawal.wallet.accountId,
            },
            select: {
              personId: true,
              status: true,
            },
          }),
          tx.userAccount.findUnique({
            where: {
              id: withdrawal.bankAccount.ownerAccountId,
            },
            select: {
              personId: true,
              status: true,
            },
          }),
        ]);

      if (!walletOwnerAccount || !bankOwnerAccount) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      if (
        walletOwnerAccount.status !== "ACTIVE" ||
        bankOwnerAccount.status !== "ACTIVE"
      ) {
        throw new Error("ACCOUNT_NOT_ACTIVE");
      }

      if (
        walletOwnerAccount.personId !== bankOwnerAccount.personId
      ) {
        throw new Error("BANK_ACCOUNT_NOT_BELONG_TO_ACCOUNT");
      }

      const shopBankAccount =
        await tx.bankAccount.findFirst({
          where: {
            ownerType: BankAccountOwnerType.SHOP,
            status: BankAccountStatus.ACTIVE,
          },
        });

      if (!shopBankAccount) {
        throw new Error(
          "SHOP_BANK_ACCOUNT_NOT_FOUND",
        );
      }

      if (
        shopBankAccount.id ===
        withdrawal.bankAccount.id
      ) {
        throw new Error(
          "BANK_SELF_TRANSFER_NOT_ALLOWED",
        );
      }

      const amount =
        new Prisma.Decimal(withdrawal.amount);

      // ============================================================
      // 1. Chuyển tiền từ Shop Bank -> User Bank
      // ============================================================

      try {
        await bankService.transferInTransaction(
          tx,
          shopBankAccount.id,
          withdrawal.bankAccount.id,
          Number(amount),
          "Withdrawal payout",
        );
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "INSUFFICIENT_BANK_BALANCE"
        ) {
          throw new Error(
            "INSUFFICIENT_SHOP_BANK_BALANCE",
          );
        }

        throw error;
      }

      // ============================================================
      // 2. Trừ tiền Wallet + release reservedBalance
      //
      // Dùng updateMany với điều kiện balance/reservedBalance
      // để đảm bảo việc debit vẫn atomic dưới concurrency.
      // ============================================================

      const walletUpdated =
        await tx.wallet.updateMany({
          where: {
            id: withdrawal.walletId,
            balance: {
              gte: amount,
            },
            reservedBalance: {
              gte: amount,
            },
          },
          data: {
            balance: {
              decrement: amount,
            },
            reservedBalance: {
              decrement: amount,
            },
          },
        });

      if (walletUpdated.count !== 1) {
        throw new Error(
          "INSUFFICIENT_RESERVED_BALANCE",
        );
      }

      // ============================================================
      // 3. Đọc lại Wallet SAU khi debit thành công
      //
      // Đây là phần sửa WD-02.
      //
      // Không sử dụng withdrawal.wallet.balance nữa vì đó là
      // snapshot được đọc ở đầu transaction và có thể stale.
      // ============================================================

      const updatedWallet =
        await tx.wallet.findUniqueOrThrow({
          where: {
            id: withdrawal.walletId,
          },
        });

      const balanceAfter =
        new Prisma.Decimal(updatedWallet.balance);

      const balanceBefore =
        balanceAfter.add(amount);

      // ============================================================
      // 4. Ghi WalletTransaction với số dư thực tế
      // ============================================================

      await tx.walletTransaction.create({
        data: {
          walletId: withdrawal.walletId,
          type: WalletTransactionType.WITHDRAWAL,
          amount: amount.negated(),
          balanceBefore,
          balanceAfter,
          description:
            "Wallet withdrawal completed",
        },
      });

      // Withdrawal đã được claim thành công ở đầu transaction.
      return tx.withdrawalRequest.findUniqueOrThrow({
        where: { id },
      });
    });
  }

}

export const withdrawalService =
  new WithdrawalService();