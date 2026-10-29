
import {
  AccountPlatform,
} from "../../generated/prisma/enums.js";
import {
  accountService,
  CreateAccountInput,
} from "../../services/account/account.service.js";
import { parsePositiveId } from "../../utils/parse-positive-id.js";

export interface CreateAccountRequest {
  personId: string | number;
  platform: AccountPlatform;
  email?: string | null;
  phone?: string | null;
  passwordHash: string;
  franchiseCode?: string;
}

export class AccountController {
  async createAccount(
    input: CreateAccountRequest,
  ) {
    const data: CreateAccountInput = {
      personId: BigInt(input.personId),
      platform: input.platform,
      email: input.email ?? null,
      phone: input.phone ?? null,
      passwordHash: input.passwordHash,
      franchiseCode: input.franchiseCode,
    };

    return accountService.createAccount(data);
  }

  async getAccountById(
    id: string,
  ) {
    return accountService.getAccountById(
      parsePositiveId(id),
    );
  }

  async getAccountByPersonAndPlatform(
    personId: string,
    platform: AccountPlatform,
  ) {
    return accountService.getAccountByPersonAndPlatform(
      parsePositiveId(personId),
      platform,
    );
  }
}

export const accountController =
  new AccountController();

