import { prisma } from "../../../lib/prisma.js";
import {
  AdminRole,
  AdminStatus,
} from "../../../generated/prisma/enums.js";
import { passwordService } from "../../auth/password.service.js";
import jwt from "jsonwebtoken";
import { authConfig } from "../../../config/auth.config.js";

export interface AdminLoginInput {
  username?: string | null;
  email?: string | null;
  password: string;
}

export interface AdminJwtPayload {
  adminId: string;
  role: AdminRole;
}

export class AdminAuthService {
  async login(input: AdminLoginInput) {
    if (!input.username && !input.email) {
      throw new Error("USERNAME_OR_EMAIL_REQUIRED");
    }

    const admin = input.username
      ? await prisma.adminAccount.findUnique({
          where: {
            username: input.username.trim(),
          },
        })
      : await prisma.adminAccount.findUnique({
          where: {
            email: input.email!.trim().toLowerCase(),
          },
        });

    if (!admin) {
      throw new Error("INVALID_ADMIN_CREDENTIALS");
    }

    if (admin.status !== AdminStatus.ACTIVE) {
      throw new Error("ADMIN_ACCOUNT_NOT_ACTIVE");
    }

    const passwordValid = await passwordService.verify(
      input.password,
      admin.passwordHash,
    );

    if (!passwordValid) {
      throw new Error("INVALID_ADMIN_CREDENTIALS");
    }

    const accessToken = jwt.sign(
      {
        adminId: admin.id.toString(),
        role: admin.role,
      },
      authConfig.jwtSecret,
      {
        expiresIn: authConfig.expiresIn,
      },
    );

    return {
      admin: this.sanitizeAdmin(admin),
      accessToken,
    };
  }

  verify(token: string): AdminJwtPayload {
    try {
      const decoded = jwt.verify(
        token,
        authConfig.jwtSecret,
      ) as jwt.JwtPayload;

      if (
        typeof decoded.adminId !== "string" ||
        (decoded.role !== AdminRole.SUPER_ADMIN &&
          decoded.role !== AdminRole.ADMIN)
      ) {
        throw new Error("INVALID_ADMIN_TOKEN_PAYLOAD");
      }

      return {
        adminId: decoded.adminId,
        role: decoded.role,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "INVALID_ADMIN_TOKEN_PAYLOAD"
      ) {
        throw error;
      }

      throw new Error("INVALID_ADMIN_TOKEN");
    }
  }

  private sanitizeAdmin(admin: any) {
    const { passwordHash: _passwordHash, ...safeAdmin } = admin;
    return safeAdmin;
  }
}

export const adminAuthService = new AdminAuthService();