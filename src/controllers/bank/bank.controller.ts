import { BankAccountOwnerType } from "../../generated/prisma/enums.js";
import { bankService } from "../../services/bank/bank.service.js";

export class BankController {
  async createAccount(
    ownerType: BankAccountOwnerType,
    ownerAccountId?: string | number,
  ) {
    return bankService.createAccount(
      ownerType,
      ownerAccountId !== undefined
        ? BigInt(ownerAccountId)
        : undefined,
    );
  }

  async getAccount(id: string | number) {
    return bankService.getAccount(BigInt(id));
  }

  async getBalance(id: string | number) {
    return bankService.getBalance(BigInt(id));
  }

  async deposit(
    id: string | number,
    amount: number,
    description?: string,
  ) {
    return bankService.deposit(
      BigInt(id),
      amount,
      description,
    );
  }

  async transfer(
    fromId: string | number,
    toId: string | number,
    amount: number,
    description?: string,
  ) {
    return bankService.transfer(
      BigInt(fromId),
      BigInt(toId),
      amount,
      description,
    );
  }

  async listAccounts() {
    return bankService.listAccounts();
  }

  async listTransactions(accountId?: string | number) {
    return bankService.listTransactions(
      accountId !== undefined ? BigInt(accountId) : undefined,
    );
  }
}

export const bankController = new BankController();