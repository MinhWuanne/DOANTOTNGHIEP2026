
import { AdminRole } from "../../generated/prisma/enums.js";
import {
  adminService,
  CreateAdminInput,
  UpdateAdminInput,
} from "../../services/admin/admin.service.js";

export interface CreateAdminRequest {
  username: string;
  email: string;
  password: string;
  role?: AdminRole;
}

export interface UpdateAdminRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: AdminRole;
}

function parseAdminId(id: string): bigint {
  if (!/^[1-9]\d*$/.test(id)) {
    throw new Error("INVALID_ID");
  }

  return BigInt(id);
}

export class AdminController {
  async createAdmin(
    input: CreateAdminRequest,
    createdById: string,
  ) {
    const data: CreateAdminInput = {
      username: input.username,
      email: input.email,
      password: input.password,
      role: input.role,
      createdById: BigInt(createdById),
    };

    return adminService.createAdmin(data);
  }

  async getAdminById(id: string) {
    return adminService.getAdminById(
      parseAdminId(id),
    );
  }

  async getAdmins() {
    return adminService.getAdmins();
  }

  async getActiveAdmins() {
    return adminService.getActiveAdmins();
  }

  async updateAdmin(
    id: string,
    input: UpdateAdminRequest,
  ) {
    const data: UpdateAdminInput = {
      username: input.username,
      email: input.email,
      password: input.password,
      role: input.role,
    };

    return adminService.updateAdmin(
      parseAdminId(id),
      data,
    );
  }

  async disableAdmin(id: string) {
    return adminService.disableAdmin(
      parseAdminId(id),
    );
  }

  async enableAdmin(id: string) {
    return adminService.enableAdmin(
      parseAdminId(id),
    );
  }
}

export const adminController =
  new AdminController();

