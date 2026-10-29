import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import {
  BankAccountStatus,
  BankAccountOwnerType,
  WalletTransactionType,
  WithdrawalStatus,
} from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

export class WalletService {
  // ============================================================
  // GET MEMBER WITHDRAWAL BANK ACCOUNTS
  // Chỉ trả về tài khoản ngân hàng ACTIVE thuộc đúng UserAccount.
  // ============================================================
  async getWithdrawalBankAccounts(
    accountId: bigint | number,
  ) {
    const id = BigInt(accountId);

    const account = await prisma.userAccount.findUnique({
      where: { id },
      select: {
        personId: true,
      },
    });

    if (!account) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    const relatedAccounts = await prisma.userAccount.findMany({
      where: {
        personId: account.personId,
        status: "ACTIVE",
      },
      select: {
        id: true,
      },
    });

    const relatedAccountIds = relatedAccounts.map(
      (item) => item.id,
    );

    return prisma.bankAccount.findMany({
      where: {
        ownerType: BankAccountOwnerType.USER,
        ownerAccountId: {
          in: relatedAccountIds,
        },
        status: BankAccountStatus.ACTIVE,
      },
      select: {
        id: true,
        accountNumber: true,
        status: true,
      },
      orderBy: {
        id: "asc",
      },
    });
  }

  // ============================================================
  // CREATE WALLET
  // Mỗi UserAccount chỉ có một Wallet.
  // Wallet được tạo với balance = 0.
  // ============================================================
  async createWallet(accountId: bigint | number) {
    const id = BigInt(accountId);

    const account = await prisma.userAccount.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!account) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    const existingWallet = await prisma.wallet.findUnique({
      where: { accountId: id },
    });

    if (existingWallet) {
      throw new Error("WALLET_ALREADY_EXISTS");
    }

    return prisma.wallet.create({
      data: {
        accountId: id,
        balance: new Prisma.Decimal(0),
        reservedBalance: new Prisma.Decimal(0),
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
            person: true,
            memberProfile: true,
            franchiseProfile: true,
          },
        },
      },
    });
  }

  // ============================================================
  // GET WALLET
  // ============================================================
  async getWallet(accountId: bigint | number) {
    const id = BigInt(accountId);

    const wallet = await prisma.wallet.findUnique({
      where: { accountId: id },
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
            person: true,
            memberProfile: true,
            franchiseProfile: true,
          },
        },
      },
    });

    if (!wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }

    return wallet;
  }

  // ============================================================
  // GET BALANCE
  // ============================================================
  async getBalance(accountId: bigint | number) {
    const wallet = await prisma.wallet.findUnique({
      where: {
        accountId: BigInt(accountId),
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

    const availableBalance =
      new Prisma.Decimal(wallet.balance)
        .minus(wallet.reservedBalance);

    return {
      balance: wallet.balance,
      reservedBalance: wallet.reservedBalance,
      availableBalance,
    };
  }

  // ============================================================
  // TOP UP
  //
  // Nạp tiền vào Platform Wallet.
  // Chưa kết nối DuckBank ở giai đoạn này.
  //
  // WalletTransaction:
  // TOP_UP
  // ============================================================
  async topUp(
    accountId: bigint | number,
    amount: Prisma.Decimal | number | string,
    description?: string,
  ) {
    const accountIdBigInt = BigInt(accountId);
    const decimalAmount = new Prisma.Decimal(amount);

    if (!decimalAmount.isFinite() || decimalAmount.lte(0)) {
      throw new Error("INVALID_AMOUNT");
    }

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          accountId: accountIdBigInt,
        },
      });

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const balanceBefore = new Prisma.Decimal(wallet.balance);
      const balanceAfter = balanceBefore.add(decimalAmount);

      const updatedWallet = await tx.wallet.update({
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
          type: WalletTransactionType.TOP_UP,
          amount: decimalAmount,
          balanceBefore,
          balanceAfter,
          description: description ?? "Wallet top up",
        },
      });

      return updatedWallet;
    });
  }

  // ============================================================
  // CREDIT IN TRANSACTION
  //
  // Dùng khi caller đã có transaction.
  //
  // Các loại transaction được phép CREDIT:
  //
  // COMMISSION
  // TOP_UP
  // REFUND
  //
  // REFUND được dùng cho Return/Refund Order.
  // ============================================================
  async creditInTransaction(
    tx: PrismaTransactionClient,
    accountId: bigint | number,
    amount: Prisma.Decimal | number | string,
    type: WalletTransactionType,
    description?: string,
  ) {
    const accountIdBigInt = BigInt(accountId);
    const decimalAmount = new Prisma.Decimal(amount);

    if (!decimalAmount.isFinite() || decimalAmount.lte(0)) {
      throw new Error("INVALID_AMOUNT");
    }

    if (
      type !== WalletTransactionType.COMMISSION &&
      type !== WalletTransactionType.TOP_UP &&
      type !== WalletTransactionType.REFUND
    ) {
      throw new Error("INVALID_CREDIT_TRANSACTION_TYPE");
    }

    const wallet = await tx.wallet.findUnique({
      where: {
        accountId: accountIdBigInt,
      },
    });

    if (!wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }

    const balanceBefore = new Prisma.Decimal(wallet.balance);
    const balanceAfter = balanceBefore.add(decimalAmount);

    const updatedWallet = await tx.wallet.update({
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
        type,
        amount: decimalAmount,
        balanceBefore,
        balanceAfter,
        description: description ?? "Wallet credit",
      },
    });

    return updatedWallet;
  }

  // ============================================================
  // CREDIT
  //
  // Public version của creditInTransaction().
  //
  // Các loại CREDIT hợp lệ:
  // COMMISSION
  // TOP_UP
  // REFUND
  // ============================================================
  async credit(
    accountId: bigint | number,
    amount: Prisma.Decimal | number | string,
    type: WalletTransactionType,
    description?: string,
  ) {
    const accountIdBigInt = BigInt(accountId);
    const decimalAmount = new Prisma.Decimal(amount);

    if (!decimalAmount.isFinite() || decimalAmount.lte(0)) {
      throw new Error("INVALID_AMOUNT");
    }

    if (
      type !== WalletTransactionType.COMMISSION &&
      type !== WalletTransactionType.TOP_UP &&
      type !== WalletTransactionType.REFUND
    ) {
      throw new Error("INVALID_CREDIT_TRANSACTION_TYPE");
    }

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          accountId: accountIdBigInt,
        },
      });

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const balanceBefore = new Prisma.Decimal(wallet.balance);
      const balanceAfter = balanceBefore.add(decimalAmount);

      const updatedWallet = await tx.wallet.update({
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
          type,
          amount: decimalAmount,
          balanceBefore,
          balanceAfter,
          description: description ?? "Wallet credit",
        },
      });

      return updatedWallet;
    });
  }

  // ============================================================
  // DEBIT
  //
  // Các loại transaction được phép DEBIT:
  //
  // ORDER_PAYMENT
  // WITHDRAWAL
  //
  // Không cho REFUND/COMMISSION/TOP_UP đi qua debit.
  // ============================================================
  async debit(
    accountId: bigint | number,
    amount: Prisma.Decimal | number | string,
    type: WalletTransactionType,
    description?: string,
  ) {
    const accountIdBigInt = BigInt(accountId);
    const decimalAmount = new Prisma.Decimal(amount);

    if (!decimalAmount.isFinite() || decimalAmount.lte(0)) {
      throw new Error("INVALID_AMOUNT");
    }

    if (
      type !== WalletTransactionType.ORDER_PAYMENT &&
      type !== WalletTransactionType.WITHDRAWAL
    ) {
      throw new Error("INVALID_DEBIT_TRANSACTION_TYPE");
    }

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          accountId: accountIdBigInt,
        },
      });

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const balanceBefore = new Prisma.Decimal(wallet.balance);

      // Atomic conditional update:
      // chỉ trừ tiền nếu Wallet vẫn còn đủ số dư.
      const result = await tx.wallet.updateMany({
        where: {
          id: wallet.id,
          balance: {
            gte: decimalAmount,
          },
          reservedBalance: {
            lte: wallet.balance.minus(decimalAmount),
          },
        },
        data: {
          balance: {
            decrement: decimalAmount,
          },
        },
      });

      if (result.count !== 1) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Đọc lại Wallet sau khi atomic update thành công
      const updatedWallet = await tx.wallet.findUnique({
        where: {
          id: wallet.id,
        },
      });

      if (!updatedWallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const balanceAfter = new Prisma.Decimal(updatedWallet.balance);

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type,
          amount: decimalAmount.negated(),
          balanceBefore,
          balanceAfter,
          description: description ?? "Wallet debit",
        },
      });

      return updatedWallet;
    });
  }

  // ============================================================
  // GET TRANSACTIONS
  // ============================================================
  async getTransactions(accountId: bigint | number) {
    const wallet = await prisma.wallet.findUnique({
      where: {
        accountId: BigInt(accountId),
      },
      select: {
        id: true,
      },
    });

    if (!wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }

    return prisma.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  // ============================================================
  // CREATE WITHDRAWAL REQUEST
  //
  // Yêu cầu rút tiền phải chỉ rõ tài khoản DuckBank nhận tiền.
  //
  // Bước này:
  // - Không trừ Wallet balance.
  // - Không chuyển tiền sang DuckBank.
  // - Chỉ tạo WithdrawalRequest PENDING.
  //
  // DuckBank Account:
  // - phải thuộc USER
  // - phải thuộc chính UserAccount đang rút tiền
  //
  // Không có Lock/Unlock Bank Account.
  // ============================================================
  async createWithdrawalRequest(
    accountId: bigint | number,
    bankAccountId: bigint | number,
    amount: Prisma.Decimal | number | string,
    note?: string,
  ) {
    const accountIdBigInt = BigInt(accountId);
    const bankAccountIdBigInt = BigInt(bankAccountId);
    const decimalAmount = new Prisma.Decimal(amount);

    if (!decimalAmount.isFinite() || decimalAmount.lte(0)) {
      throw new Error("INVALID_AMOUNT");
    }

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          accountId: accountIdBigInt,
        },
      });

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const bankAccount = await tx.bankAccount.findUnique({
        where: {
          id: bankAccountIdBigInt,
        },
      });

      if (!bankAccount) {
        throw new Error("BANK_ACCOUNT_NOT_FOUND");
      }

      if (bankAccount.ownerType !== BankAccountOwnerType.USER) {
        throw new Error("INVALID_BANK_ACCOUNT_OWNER");
      }

      if (bankAccount.status !== BankAccountStatus.ACTIVE) {
        throw new Error("BANK_ACCOUNT_NOT_ACTIVE");
      }

      if (bankAccount.ownerAccountId === null) {
        throw new Error("BANK_ACCOUNT_NOT_BELONG_TO_ACCOUNT");
      }

      const [requestingAccount, bankOwnerAccount] =
        await Promise.all([
          tx.userAccount.findUnique({
            where: {
              id: accountIdBigInt,
            },
            select: {
              personId: true,
              status: true,
            },
          }),
          tx.userAccount.findUnique({
            where: {
              id: bankAccount.ownerAccountId,
            },
            select: {
              personId: true,
              status: true,
            },
          }),
        ]);

      if (!requestingAccount || !bankOwnerAccount) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      if (
        requestingAccount.status !== "ACTIVE" ||
        bankOwnerAccount.status !== "ACTIVE"
      ) {
        throw new Error("ACCOUNT_NOT_ACTIVE");
      }

      if (
        requestingAccount.personId !== bankOwnerAccount.personId
      ) {
        throw new Error("BANK_ACCOUNT_NOT_BELONG_TO_ACCOUNT");
      }

      // ============================================================
      // W2-A: Atomic reserve
      //
      // available = balance - reservedBalance
      //
      // Chỉ reserve nếu available >= withdrawal amount.
      // UPDATE này được thực hiện atomic để chống race condition
      // khi nhiều withdrawal được tạo đồng thời.
      // ============================================================
      const reserved = await tx.$executeRaw`
      UPDATE wallets
      SET reservedBalance = reservedBalance + ${decimalAmount}
      WHERE id = ${wallet.id}
        AND balance - reservedBalance >= ${decimalAmount}
    `;

      if (reserved !== 1) {
        throw new Error("INSUFFICIENT_AVAILABLE_BALANCE");
      }

      return tx.withdrawalRequest.create({
        data: {
          walletId: wallet.id,
          bankAccountId: bankAccount.id,
          amount: decimalAmount,
          status: WithdrawalStatus.PENDING,
          note,
        },
      });
    });
  }
}

export const walletService = new WalletService();