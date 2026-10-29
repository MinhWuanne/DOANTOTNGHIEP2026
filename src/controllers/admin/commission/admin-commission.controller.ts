import { adminCommissionService } from "../../../services/admin/commission/admin-commission.service.js";

export class AdminCommissionController {
  async getCommissions() {
    return adminCommissionService.getCommissions();
  }
}

export const adminCommissionController =
  new AdminCommissionController();