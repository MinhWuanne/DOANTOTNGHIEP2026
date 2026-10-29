import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import {
  AccountPlatform,
  FranchiseStatus,
  UserStatus,
} from "../../../generated/prisma/enums.js";

export interface UpdateAdminFranchiseInput {
  fullName?: string;
  email?: string;
  phone?: string;
}

export type AdminFranchiseStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "LOCKED";

export class AdminFranchiseService {
  async getFranchises() {
    return prisma.userAccount.findMany({
      where: {
        platform: AccountPlatform.FRANCHISE,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        personId: true,
        platform: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        person: true,
        franchiseProfile: true,
      },
    });
  }

  async getFranchiseById(id: bigint | number) {
    const franchise = await prisma.userAccount.findFirst({
      where: {
        id,
        platform: AccountPlatform.FRANCHISE,
      },
      select: {
        id: true,
        personId: true,
        platform: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        person: true,
        franchiseProfile: true,
      },
    });

    if (!franchise) {
      throw new Error("FRANCHISE_NOT_FOUND");
    }

    return franchise;
  }

  async updateFranchise(
    id: bigint | number,
    input: UpdateAdminFranchiseInput,
  ) {
    const allowedFields = new Set([
      "fullName",
      "email",
      "phone",
    ]);

    const receivedFields = Object.keys(input);

    for (const field of receivedFields) {
      if (!allowedFields.has(field)) {
        throw new Error("INVALID_UPDATE_FIELDS");
      }
    }

    if (receivedFields.length === 0) {
      throw new Error("NO_FIELDS_TO_UPDATE");
    }

    const fullName =
      input.fullName !== undefined
        ? input.fullName.trim()
        : undefined;

    const email =
      input.email !== undefined
        ? input.email.trim()
        : undefined;

    const phone =
      input.phone !== undefined
        ? input.phone.trim()
        : undefined;

    if (
      input.fullName !== undefined &&
      !fullName
    ) {
      throw new Error("FULL_NAME_REQUIRED");
    }

    if (
      input.email !== undefined &&
      !email
    ) {
      throw new Error("EMAIL_REQUIRED");
    }

    if (
      input.phone !== undefined &&
      !phone
    ) {
      throw new Error("PHONE_REQUIRED");
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const franchise = await tx.userAccount.findFirst({
          where: {
            id,
            platform: AccountPlatform.FRANCHISE,
          },
          select: {
            id: true,
            personId: true,
          },
        });

        if (!franchise) {
          throw new Error("FRANCHISE_NOT_FOUND");
        }

        if (fullName !== undefined) {
          await tx.person.update({
            where: {
              id: franchise.personId,
            },
            data: {
              fullName,
            },
          });
        }

        const accountData: {
          email?: string;
          phone?: string;
        } = {};

        if (email !== undefined) {
          accountData.email = email;
        }

        if (phone !== undefined) {
          accountData.phone = phone;
        }

        if (Object.keys(accountData).length > 0) {
          await tx.userAccount.update({
            where: {
              id: franchise.id,
            },
            data: accountData,
          });
        }

        return tx.userAccount.findFirstOrThrow({
          where: {
            id: franchise.id,
            platform: AccountPlatform.FRANCHISE,
          },
          select: {
            id: true,
            personId: true,
            platform: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true,

            person: true,
            franchiseProfile: true,
          },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const errorText = [
          error.message,
          String(error.meta?.target ?? ""),
        ]
          .join(" ")
          .toLowerCase();

        if (
          errorText.includes("phone") ||
          errorText.includes("platform_phone") ||
          errorText.includes(
            "user_accounts_platform_phone_key",
          )
        ) {
          throw new Error("PHONE_ALREADY_EXISTS");
        }

        if (
          errorText.includes("email") ||
          errorText.includes("platform_email") ||
          errorText.includes(
            "user_accounts_platform_email_key",
          )
        ) {
          throw new Error("EMAIL_ALREADY_EXISTS");
        }

        if (
          email !== undefined &&
          phone === undefined
        ) {
          throw new Error("EMAIL_ALREADY_EXISTS");
        }

        if (
          phone !== undefined &&
          email === undefined
        ) {
          throw new Error("PHONE_ALREADY_EXISTS");
        }

        throw new Error("DUPLICATE_FRANCHISE_DATA");
      }

      throw error;
    }
  }

  /**
   * Quản lý UserAccount.status của Franchise.
   *
   * ACTIVE  -> LOCKED
   * LOCKED  -> ACTIVE
   *
   * Đây là khóa/mở khóa tài khoản đăng nhập,
   * KHÔNG phải FranchiseProfile.status.
   */
  async lockFranchise(id: bigint | number) {
    const affectedRows =
      await prisma.userAccount.updateMany({
        where: {
          id,
          platform: AccountPlatform.FRANCHISE,
          status: UserStatus.ACTIVE,
        },
        data: {
          status: UserStatus.LOCKED,
        },
      });

    if (affectedRows.count === 0) {
      const franchise =
        await prisma.userAccount.findFirst({
          where: {
            id,
            platform: AccountPlatform.FRANCHISE,
          },
          select: {
            status: true,
          },
        });

      if (!franchise) {
        throw new Error("FRANCHISE_NOT_FOUND");
      }

      if (
        franchise.status === UserStatus.LOCKED
      ) {
        throw new Error(
          "FRANCHISE_ALREADY_LOCKED",
        );
      }

      throw new Error(
        "INVALID_FRANCHISE_STATUS",
      );
    }

    return prisma.userAccount.findFirstOrThrow({
      where: {
        id,
        platform: AccountPlatform.FRANCHISE,
      },
      select: {
        id: true,
        personId: true,
        platform: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        person: true,
        franchiseProfile: true,
      },
    });
  }

  /**
   * Mở khóa UserAccount của Franchise.
   *
   * Đây chỉ là Account Status:
   * LOCKED -> ACTIVE
   *
   * Không thay đổi FranchiseProfile.status.
   */
  async unlockFranchise(id: bigint | number) {
    const affectedRows =
      await prisma.userAccount.updateMany({
        where: {
          id,
          platform: AccountPlatform.FRANCHISE,
          status: UserStatus.LOCKED,
        },
        data: {
          status: UserStatus.ACTIVE,
        },
      });

    if (affectedRows.count === 0) {
      const franchise =
        await prisma.userAccount.findFirst({
          where: {
            id,
            platform: AccountPlatform.FRANCHISE,
          },
          select: {
            status: true,
          },
        });

      if (!franchise) {
        throw new Error("FRANCHISE_NOT_FOUND");
      }

      if (
        franchise.status === UserStatus.ACTIVE
      ) {
        throw new Error(
          "FRANCHISE_ALREADY_ACTIVE",
        );
      }

      throw new Error(
        "INVALID_FRANCHISE_STATUS",
      );
    }

    return prisma.userAccount.findFirstOrThrow({
      where: {
        id,
        platform: AccountPlatform.FRANCHISE,
      },
      select: {
        id: true,
        personId: true,
        platform: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        person: true,
        franchiseProfile: true,
      },
    });
  }

  /**
   * Thay đổi FranchiseProfile.status do Admin quản lý.
   *
   * Các transition hợp lệ:
   *
   * ACTIVE    -> SUSPENDED
   * SUSPENDED -> ACTIVE
   * ACTIVE    -> LOCKED
   *
   * LOCKED và TERMINATED là terminal state:
   * không thể quay lại ACTIVE.
   *
   * TERMINATED không được Admin tạo bằng API này,
   * vì TERMINATED là trạng thái Franchise tự nguyện
   * chấm dứt hoạt động.
   */
  async updateFranchiseStatus(
    id: bigint | number,
    status: AdminFranchiseStatus,
  ) {
    const franchise =
      await prisma.userAccount.findFirst({
        where: {
          id,
          platform: AccountPlatform.FRANCHISE,
        },
        select: {
          id: true,
          franchiseProfile: {
            select: {
              status: true,
            },
          },
        },
      });

    if (!franchise) {
      throw new Error("FRANCHISE_NOT_FOUND");
    }

    const currentStatus =
      franchise.franchiseProfile?.status;

    if (!currentStatus) {
      throw new Error(
        "FRANCHISE_PROFILE_NOT_FOUND",
      );
    }

    if (currentStatus === status) {
      throw new Error(
        "FRANCHISE_STATUS_ALREADY_SET",
      );
    }

    const isValidTransition =
      (currentStatus === FranchiseStatus.ACTIVE &&
        status === FranchiseStatus.SUSPENDED) ||
      (currentStatus === FranchiseStatus.SUSPENDED &&
        status === FranchiseStatus.ACTIVE) ||
      (currentStatus === FranchiseStatus.ACTIVE &&
        status === FranchiseStatus.LOCKED);

    if (!isValidTransition) {
      if (
        currentStatus === FranchiseStatus.LOCKED
      ) {
        throw new Error(
          "FRANCHISE_STATUS_LOCKED",
        );
      }

      if (
        currentStatus === FranchiseStatus.TERMINATED
      ) {
        throw new Error(
          "FRANCHISE_STATUS_TERMINATED",
        );
      }

      throw new Error(
        "INVALID_FRANCHISE_STATUS_TRANSITION",
      );
    }

    await prisma.franchiseProfile.update({
      where: {
        accountId: franchise.id,
      },
      data: {
        status,
      },
    });

    return prisma.userAccount.findFirstOrThrow({
      where: {
        id: franchise.id,
        platform: AccountPlatform.FRANCHISE,
      },
      select: {
        id: true,
        personId: true,
        platform: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,

        person: true,
        franchiseProfile: true,
      },
    });
  }
}

export const adminFranchiseService =
  new AdminFranchiseService();