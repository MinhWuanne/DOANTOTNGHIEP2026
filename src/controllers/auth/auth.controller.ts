
import {
  authService,
  LoginInput,
  RegisterMemberInput,
} from "../../services/auth/auth.service.js";

export interface RegisterMemberRequest {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  inviteCode?: string | null;
}

export interface LoginRequest {
  email?: string | null;
  phone?: string | null;
  password: string;
}

export class AuthController {
  async registerMember(
    input: RegisterMemberRequest,
  ) {
    const data: RegisterMemberInput = {
      fullName: input.fullName,
      email: input.email ?? null,
      phone: input.phone ?? null,
      password: input.password,
      inviteCode: input.inviteCode ?? null,
    };

    return authService.registerMember(data);
  }

  async login(input: LoginRequest) {
    const data: LoginInput = {
      email: input.email ?? null,
      phone: input.phone ?? null,
      password: input.password,
    };

    return authService.login(data);
  }

  async loginFranchise(
    input: LoginRequest,
  ) {
    const data: LoginInput = {
      email: input.email ?? null,
      phone: input.phone ?? null,
      password: input.password,
    };

    return authService.loginFranchise(data);
  }
}

export const authController =
  new AuthController();

