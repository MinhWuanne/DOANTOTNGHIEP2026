import { adminFranchiseService } from "../../../services/admin/franchise/admin-franchise.service.js";

import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";

export class AdminFranchiseController {
  async getFranchises() {
    return adminFranchiseService.getFranchises();
  }

  async getFranchiseById(id: string) {
    return adminFranchiseService.getFranchiseById(
      parseAdminId(id),
    );
  }

  async updateFranchise(
    id: string,
    input: {
      fullName?: string;
      email?: string;
      phone?: string;
    },
  ) {
    return adminFranchiseService.updateFranchise(
      parseAdminId(id),
      input,
    );
  }

  async lockFranchise(id: string) {
    return adminFranchiseService.lockFranchise(
      parseAdminId(id),
    );
  }

  async unlockFranchise(id: string) {
    return adminFranchiseService.unlockFranchise(
      parseAdminId(id),
    );
  }

  async updateFranchiseStatus(
    id: string,
    status: "ACTIVE" | "SUSPENDED" | "LOCKED",
  ) {
    return adminFranchiseService.updateFranchiseStatus(
      parseAdminId(id),
      status,
    );
  }
}

export const adminFranchiseController =
  new AdminFranchiseController();