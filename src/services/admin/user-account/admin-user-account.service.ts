
import { prisma } from "../../../lib/prisma.js";
import {
  AccountPlatform,
  UserStatus,
} from "../../../generated/prisma/enums.js";

export class AdminUserAccountService {
  async getUserAccounts() {
    return prisma.userAccount.findMany({
      where: {
        platform: {
          in: [
            AccountPlatform.MEMBER,
            AccountPlatform.FRANCHISE,
          ],
        },
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
        memberProfile: true,
        franchiseProfile: true,
      },
    });
  }

  async getUserAccountById(id: bigint | number) {
    const account = await prisma.userAccount.findFirst({
      where: {
        id,
        platform: {
          in: [
            AccountPlatform.MEMBER,
            AccountPlatform.FRANCHISE,
          ],
        },
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
        memberProfile: true,
        franchiseProfile: true,
      },
    });

    if (!account) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    return account;
  }

  async lockUserAccount(id: bigint | number) {
    const affectedRows = await prisma.userAccount.updateMany({
      where: {
        id,
        platform: {
          in: [
            AccountPlatform.MEMBER,
            AccountPlatform.FRANCHISE,
          ],
        },
        status: UserStatus.ACTIVE,
      },
      data: {
        status: UserStatus.LOCKED,
      },
    });

    if (affectedRows.count === 0) {
      const account = await prisma.userAccount.findFirst({
        where: {
          id,
          platform: {
            in: [
              AccountPlatform.MEMBER,
              AccountPlatform.FRANCHISE,
            ],
          },
        },
        select: {
          status: true,
        },
      });

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      if (account.status === UserStatus.LOCKED) {
        throw new Error("ACCOUNT_ALREADY_LOCKED");
      }

      throw new Error("INVALID_ACCOUNT_STATUS");
    }

    return prisma.userAccount.findFirstOrThrow({
      where: {
        id,
        platform: {
          in: [
            AccountPlatform.MEMBER,
            AccountPlatform.FRANCHISE,
          ],
        },
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
        memberProfile: true,
        franchiseProfile: true,
      },
    });
  }

  async unlockUserAccount(id: bigint | number) {
    const affectedRows = await prisma.userAccount.updateMany({
      where: {
        id,
        platform: {
          in: [
            AccountPlatform.MEMBER,
            AccountPlatform.FRANCHISE,
          ],
        },
        status: UserStatus.LOCKED,
      },
      data: {
        status: UserStatus.ACTIVE,
      },
    });

    if (affectedRows.count === 0) {
      const account = await prisma.userAccount.findFirst({
        where: {
          id,
          platform: {
            in: [
              AccountPlatform.MEMBER,
              AccountPlatform.FRANCHISE,
            ],
          },
        },
        select: {
          status: true,
        },
      });

      if (!account) {
        throw new Error("ACCOUNT_NOT_FOUND");
      }

      if (account.status === UserStatus.ACTIVE) {
        throw new Error("ACCOUNT_ALREADY_ACTIVE");
      }

      throw new Error("INVALID_ACCOUNT_STATUS");
    }

    return prisma.userAccount.findFirstOrThrow({
      where: {
        id,
        platform: {
          in: [
            AccountPlatform.MEMBER,
            AccountPlatform.FRANCHISE,
          ],
        },
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
        memberProfile: true,
        franchiseProfile: true,
      },
    });
  }
}

export const adminUserAccountService =
  new AdminUserAccountService();

