import { adminWithdrawalService } from "../../../services/admin/withdrawal/admin-withdrawal.service.js";
import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";

export class AdminWithdrawalController {
  async getWithdrawals() {
    return adminWithdrawalService.getWithdrawals();
  }

  async getWithdrawalById(id: string) {
    return adminWithdrawalService.getWithdrawalById(
      parseAdminId(id),
    );
  }

  async approveWithdrawal(id: string) {
    return adminWithdrawalService.approveWithdrawal(
      parseAdminId(id),
    );
  }

  async rejectWithdrawal(
    id: string,
    note?: string,
  ) {
    return adminWithdrawalService.rejectWithdrawal(
      parseAdminId(id),
      note,
    );
  }

  async completeWithdrawal(id: string) {
    return adminWithdrawalService.completeWithdrawal(
      parseAdminId(id),
    );
  }
}

export const adminWithdrawalController =
  new AdminWithdrawalController();