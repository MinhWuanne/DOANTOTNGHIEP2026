
import { prisma } from "../../lib/prisma.js";
import {
  AdminRole,
  AdminStatus,
} from "../../generated/prisma/enums.js";
import { passwordService } from "../auth/password.service.js";

export interface CreateAdminInput {
  username: string;
  email: string;
  password: string;
  role?: AdminRole;
  createdById?: bigint | null;
}

export interface UpdateAdminInput {
  username?: string;
  email?: string;
  password?: string;
  role?: AdminRole;
}

export class AdminService {
  async createAdmin(input: CreateAdminInput) {
    // ----------------------------------------------------------
    // Runtime validation
    // ----------------------------------------------------------

    if (
      typeof input.username !== "string" ||
      typeof input.email !== "string" ||
      typeof input.password !== "string"
    ) {
      throw new Error("INVALID_INPUT");
    }

    if (
      input.role !== undefined &&
      input.role !== AdminRole.ADMIN &&
      input.role !== AdminRole.SUPER_ADMIN
    ) {
      throw new Error("INVALID_INPUT");
    }

    if (
      input.createdById !== undefined &&
      input.createdById !== null &&
      typeof input.createdById !== "bigint"
    ) {
      throw new Error("INVALID_INPUT");
    }

    const username = input.username.trim();
    const email = input.email.trim().toLowerCase();

    if (!username) {
      throw new Error("USERNAME_REQUIRED");
    }

    if (!email) {
      throw new Error("EMAIL_REQUIRED");
    }

    if (!input.password.trim()) {
      throw new Error("PASSWORD_REQUIRED");
    }

    // ----------------------------------------------------------
    // Business rule:
    // Hệ thống chỉ có một SUPER_ADMIN duy nhất.
    // SUPER_ADMIN chỉ được dùng để tạo ADMIN.
    // ----------------------------------------------------------

    if (input.role === AdminRole.SUPER_ADMIN) {
      throw new Error("SUPER_ADMIN_CREATION_NOT_ALLOWED");
    }

    if (
      input.createdById !== undefined &&
      input.createdById !== null
    ) {
      const creator = await prisma.adminAccount.findUnique({
        where: {
          id: input.createdById,
        },
      });

      if (!creator) {
        throw new Error("CREATOR_NOT_FOUND");
      }

      if (creator.status !== AdminStatus.ACTIVE) {
        throw new Error("CREATOR_NOT_ACTIVE");
      }

      if (creator.role !== AdminRole.SUPER_ADMIN) {
        throw new Error("SUPER_ADMIN_CREATOR_REQUIRED");
      }
    }

    const existingUsername =
      await prisma.adminAccount.findUnique({
        where: {
          username,
        },
      });

    if (existingUsername) {
      throw new Error("USERNAME_ALREADY_EXISTS");
    }

    const existingEmail =
      await prisma.adminAccount.findUnique({
        where: {
          email,
        },
      });

    if (existingEmail) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }

    const passwordHash =
      await passwordService.hash(input.password);

    const admin = await prisma.adminAccount.create({
      data: {
        username,
        email,
        passwordHash,
        role: AdminRole.ADMIN,
        status: AdminStatus.ACTIVE,
        createdById: input.createdById ?? null,
      },
    });

    return this.sanitizeAdmin(admin);
  }

  async getAdminById(id: bigint) {
    const admin = await prisma.adminAccount.findUnique({
      where: {
        id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!admin) {
      throw new Error("ADMIN_NOT_FOUND");
    }

    return this.sanitizeAdmin(admin);
  }

    async getActiveAdmins() {
    return prisma.adminAccount.findMany({
      where: {
        role: AdminRole.ADMIN,
        status: AdminStatus.ACTIVE,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
  }

  async getAdmins() {
    const admins =
      await prisma.adminAccount.findMany({
        where: {
          role: AdminRole.ADMIN,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          status: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return admins;
  }

  async updateAdmin(
    id: bigint,
    input: UpdateAdminInput,
  ) {
    const admin =
      await prisma.adminAccount.findUnique({
        where: {
          id,
        },
      });

    if (!admin) {
      throw new Error("ADMIN_NOT_FOUND");
    }

    // ----------------------------------------------------------
    // Runtime validation
    // ----------------------------------------------------------

    if (
      input.username !== undefined &&
      typeof input.username !== "string"
    ) {
      throw new Error("INVALID_INPUT");
    }

    if (
      input.email !== undefined &&
      typeof input.email !== "string"
    ) {
      throw new Error("INVALID_INPUT");
    }

    if (
      input.password !== undefined &&
      typeof input.password !== "string"
    ) {
      throw new Error("INVALID_INPUT");
    }

    if (
      input.role !== undefined &&
      input.role !== AdminRole.ADMIN &&
      input.role !== AdminRole.SUPER_ADMIN
    ) {
      throw new Error("INVALID_INPUT");
    }

    const data: {
      username?: string;
      email?: string;
      passwordHash?: string;
      role?: AdminRole;
    } = {};

    if (input.username !== undefined) {
      const username = input.username.trim();

      if (!username) {
        throw new Error("USERNAME_REQUIRED");
      }

      if (username !== admin.username) {
        const existingUsername =
          await prisma.adminAccount.findUnique({
            where: {
              username,
            },
          });

        if (
          existingUsername &&
          existingUsername.id !== admin.id
        ) {
          throw new Error("USERNAME_ALREADY_EXISTS");
        }
      }

      data.username = username;
    }

    if (input.email !== undefined) {
      const email = input.email.trim().toLowerCase();

      if (!email) {
        throw new Error("EMAIL_REQUIRED");
      }

      if (email !== admin.email) {
        const existingEmail =
          await prisma.adminAccount.findUnique({
            where: {
              email,
            },
          });

        if (
          existingEmail &&
          existingEmail.id !== admin.id
        ) {
          throw new Error("EMAIL_ALREADY_EXISTS");
        }
      }

      data.email = email;
    }

    if (input.password !== undefined) {
      if (!input.password.trim()) {
        throw new Error("PASSWORD_REQUIRED");
      }

      data.passwordHash =
        await passwordService.hash(input.password);
    }

    // ----------------------------------------------------------
    // Business rule:
    // Không được chuyển ADMIN thành SUPER_ADMIN.
    // Không được thay đổi role của SUPER_ADMIN.
    // ----------------------------------------------------------

    if (input.role !== undefined) {
      if (input.role === AdminRole.SUPER_ADMIN) {
        throw new Error(
          "SUPER_ADMIN_ROLE_CHANGE_NOT_ALLOWED",
        );
      }

      if (admin.role === AdminRole.SUPER_ADMIN) {
        throw new Error(
          "SUPER_ADMIN_ROLE_CHANGE_NOT_ALLOWED",
        );
      }

      data.role = AdminRole.ADMIN;
    }

    // ----------------------------------------------------------
    // Business rule:
    // PATCH {} không được phép.
    // Phải có ít nhất một field hợp lệ để cập nhật.
    // ----------------------------------------------------------

    if (Object.keys(data).length === 0) {
      throw new Error("NO_FIELDS_TO_UPDATE");
    }

    const updatedAdmin =
      await prisma.adminAccount.update({
        where: {
          id,
        },
        data,
      });

    return this.sanitizeAdmin(updatedAdmin);
  }

  async disableAdmin(id: bigint) {
    const admin =
      await prisma.adminAccount.findUnique({
        where: {
          id,
        },
      });

    if (!admin) {
      throw new Error("ADMIN_NOT_FOUND");
    }

    // ----------------------------------------------------------
    // Business rule:
    // SUPER_ADMIN duy nhất không được disable.
    // ----------------------------------------------------------

    if (admin.role === AdminRole.SUPER_ADMIN) {
      throw new Error(
        "SUPER_ADMIN_CANNOT_BE_DISABLED",
      );
    }

    // ----------------------------------------------------------
    // Concurrency protection:
    // Chỉ ADMIN đang ACTIVE mới được chuyển sang DISABLED.
    //
    // Nếu 2 request disable chạy đồng thời:
    // - request đầu tiên update được 1 row
    // - request thứ hai update 0 row
    // ----------------------------------------------------------

    const updated =
      await prisma.adminAccount.updateMany({
        where: {
          id,
          role: AdminRole.ADMIN,
          status: AdminStatus.ACTIVE,
        },
        data: {
          status: AdminStatus.DISABLED,
        },
      });

    if (updated.count === 0) {
      throw new Error("ADMIN_ALREADY_DISABLED");
    }

    const updatedAdmin =
      await prisma.adminAccount.findUnique({
        where: {
          id,
        },
      });

    if (!updatedAdmin) {
      throw new Error("ADMIN_NOT_FOUND");
    }

    return this.sanitizeAdmin(updatedAdmin);
  }

  async enableAdmin(id: bigint) {
    const admin =
      await prisma.adminAccount.findUnique({
        where: {
          id,
        },
      });

    if (!admin) {
      throw new Error("ADMIN_NOT_FOUND");
    }

    // ----------------------------------------------------------
    // Concurrency protection:
    // Chỉ ADMIN đang DISABLED mới được chuyển sang ACTIVE.
    //
    // Nếu 2 request enable chạy đồng thời:
    // - request đầu tiên update được 1 row
    // - request thứ hai update 0 row
    // ----------------------------------------------------------

    const updated =
      await prisma.adminAccount.updateMany({
        where: {
          id,
          role: AdminRole.ADMIN,
          status: AdminStatus.DISABLED,
        },
        data: {
          status: AdminStatus.ACTIVE,
        },
      });

    if (updated.count === 0) {
      throw new Error("ADMIN_ALREADY_ACTIVE");
    }

    const updatedAdmin =
      await prisma.adminAccount.findUnique({
        where: {
          id,
        },
      });

    if (!updatedAdmin) {
      throw new Error("ADMIN_NOT_FOUND");
    }

    return this.sanitizeAdmin(updatedAdmin);
  }

  private sanitizeAdmin(admin: any) {
    const {
      passwordHash: _passwordHash,
      ...safeAdmin
    } = admin;

    return safeAdmin;
  }
}

export const adminService =
  new AdminService();

