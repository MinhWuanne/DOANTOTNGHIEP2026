import { adminUserAccountService } from "../../../services/admin/user-account/admin-user-account.service.js";
import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";

export class AdminUserAccountController {
  async getUserAccounts() {
    return adminUserAccountService.getUserAccounts();
  }

  async getUserAccountById(id: string) {
    return adminUserAccountService.getUserAccountById(
      parseAdminId(id),
    );
  }

  async lockUserAccount(id: string) {
    return adminUserAccountService.lockUserAccount(
      parseAdminId(id),
    );
  }

  async unlockUserAccount(id: string) {
    return adminUserAccountService.unlockUserAccount(
      parseAdminId(id),
    );
  }
}

export const adminUserAccountController =
  new AdminUserAccountController();