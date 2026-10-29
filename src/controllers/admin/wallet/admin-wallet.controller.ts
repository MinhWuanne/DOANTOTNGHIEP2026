
import {
  AccountPlatform,
  UserStatus,
} from "../../../generated/prisma/enums.js";
import {
  adminWalletService,
  type AdminWalletListParams,
} from "../../../services/admin/wallet/admin-wallet.service.js";
import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";

export class AdminWalletController {
  async getWallets(params: AdminWalletListParams = {}) {
    return adminWalletService.getWallets(params);
  }

  async getWalletByAccountId(accountId: string) {
    return adminWalletService.getWalletByAccountId(
      parseAdminId(accountId),
    );
  }

  async getTransactions(accountId: string) {
    return adminWalletService.getTransactions(
      parseAdminId(accountId),
    );
  }
}

export const adminWalletController =
  new AdminWalletController();
