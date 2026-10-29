
import { ReturnStatus } from "../../../generated/prisma/enums.js";
import {
  adminReturnService,
} from "../../../services/admin/return/admin-return.service.js";
import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";

export class AdminReturnController {
  async getReturnRequests(
    status?: ReturnStatus,
  ) {
    return adminReturnService.getReturnRequests(
      status,
    );
  }

  async getReturnRequestById(
    id: string,
  ) {
    return adminReturnService.getReturnRequestById(
      parseAdminId(id),
    );
  }

  
  async approveReturn(
    id: string,
  ) {
    return adminReturnService.approveReturn(
      parseAdminId(id),
    );
  }

  async rejectReturn(
    id: string,
    note?: string,
  ) {
    return adminReturnService.rejectReturn(
      parseAdminId(id),
      note,
    );
  }

}

export const adminReturnController =
  new AdminReturnController();
