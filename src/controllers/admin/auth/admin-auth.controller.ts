import {
  adminAuthService,
  AdminLoginInput,
} from "../../../services/admin/auth/admin-auth.service.js";

export interface AdminLoginRequest {
  username?: string | null;
  email?: string | null;
  password: string;
}

export class AdminAuthController {
  async login(input: AdminLoginRequest) {
    const data: AdminLoginInput = {
      username: input.username ?? null,
      email: input.email ?? null,
      password: input.password,
    };

    return adminAuthService.login(data);
  }
}

export const adminAuthController = new AdminAuthController();