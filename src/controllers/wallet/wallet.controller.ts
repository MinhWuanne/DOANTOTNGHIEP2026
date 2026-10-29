import {
  Prisma,
} from "../../generated/prisma/client.js";

import {
  WalletTransactionType,
} from "../../generated/prisma/enums.js";

import {
  walletService,
} from "../../services/wallet/wallet.service.js";

export interface WalletAmountRequest {
  amount: string | number;
  description?: string;
}

export interface WalletCreditRequest {
  amount: string | number;
  type: WalletTransactionType;
  description?: string;
}

export interface WalletDebitRequest {
  amount: string | number;
  type: WalletTransactionType;
  description?: string;
}

export interface WithdrawalRequestInput {
  bankAccountId: string | number;
  amount: string | number;
  note?: string;
}

export class WalletController {
  async createWallet(
    accountId: string | number,
  ) {
    return walletService.createWallet(
      BigInt(accountId),
    );
  }

  async getWallet(
    accountId: string | number,
  ) {
    return walletService.getWallet(
      BigInt(accountId),
    );
  }

  async getBalance(
    accountId: string | number,
  ) {
    return walletService.getBalance(
      BigInt(accountId),
    );
  }

  async topUp(
    accountId: string | number,
    input: WalletAmountRequest,
  ) {
    return walletService.topUp(
      BigInt(accountId),
      new Prisma.Decimal(input.amount),
      input.description,
    );
  }

  async credit(
    accountId: string | number,
    input: WalletCreditRequest,
  ) {
    return walletService.credit(
      BigInt(accountId),
      new Prisma.Decimal(input.amount),
      input.type,
      input.description,
    );
  }

  async debit(
    accountId: string | number,
    input: WalletDebitRequest,
  ) {
    return walletService.debit(
      BigInt(accountId),
      new Prisma.Decimal(input.amount),
      input.type,
      input.description,
    );
  }

  async getTransactions(
    accountId: string | number,
  ) {
    return walletService.getTransactions(
      BigInt(accountId),
    );
  }

  async getWithdrawalBankAccounts(
    accountId: string | number,
  ) {
    return walletService.getWithdrawalBankAccounts(
      BigInt(accountId),
    );
  }

  async createWithdrawalRequest(
    accountId: string | number,
    input: WithdrawalRequestInput,
  ) {
    return walletService.createWithdrawalRequest(
      BigInt(accountId),
      BigInt(input.bankAccountId),
      new Prisma.Decimal(input.amount),
      input.note,
    );
  }
}

export const walletController =
  new WalletController();