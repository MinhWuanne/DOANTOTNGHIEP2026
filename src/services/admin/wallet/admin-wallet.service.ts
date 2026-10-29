
import {
  AccountPlatform,
  UserStatus,
} from "../../../generated/prisma/enums.js";
import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";

export interface AdminWalletListParams {
  page?: number;
  limit?: number;
  search?: string;
  platform?: AccountPlatform;
  status?: UserStatus;
  sortBy?: "createdAt" | "balance";
  sortOrder?: "asc" | "desc";
}

export class AdminWalletService {
  async getWallets(params: AdminWalletListParams = {}) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const search = params.search?.trim() ?? "";
    const platform = params.platform;
    const status = params.status;
    const sortBy = params.sortBy ?? "createdAt";
    const sortOrder = params.sortOrder ?? "desc";

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      ![10, 20, 50].includes(limit)
    ) {
      throw new Error("INVALID_PAGINATION");
    }

    if (
      platform !== undefined &&
      !Object.values(AccountPlatform).includes(platform)
    ) {
      throw new Error("INVALID_WALLET_PLATFORM");
    }

    if (
      status !== undefined &&
      !Object.values(UserStatus).includes(status)
    ) {
      throw new Error("INVALID_USER_STATUS");
    }

    if (
      !["createdAt", "balance"].includes(sortBy)
    ) {
      throw new Error("INVALID_WALLET_SORT_FIELD");
    }

    if (
      !["asc", "desc"].includes(sortOrder)
    ) {
      throw new Error("INVALID_WALLET_SORT_ORDER");
    }

    const accountWhere: Prisma.UserAccountWhereInput = {
      platform: {
        in: [
          AccountPlatform.MEMBER,
          AccountPlatform.FRANCHISE,
        ],
      },
      ...(platform ? { platform } : {}),
      ...(status ? { status } : {}),
    };

    const searchConditions: Prisma.WalletWhereInput[] = [];

    if (search) {
      searchConditions.push(
        {
          account: {
            person: {
              fullName: {
                contains: search,
              },
            },
          },
        },
        {
          account: {
            person: {
              email: {
                contains: search,
              },
            },
          },
        },
        {
          account: {
            person: {
              phone: {
                contains: search,
              },
            },
          },
        },
        {
          account: {
            email: {
              contains: search,
            },
          },
        },
        {
          account: {
            phone: {
              contains: search,
            },
          },
        },
      );

      if (/^\d+$/.test(search)) {
        const id = BigInt(search);

        searchConditions.push(
          { id },
          { accountId: id },
        );
      }
    }

    const where: Prisma.WalletWhereInput = {
      account: accountWhere,
      ...(search
        ? {
          AND: [
            {
              OR: searchConditions,
            },
          ],
        }
        : {}),
    };

    const [wallets, total] = await prisma.$transaction([
      prisma.wallet.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          accountId: true,
          balance: true,
          createdAt: true,
          updatedAt: true,
          account: {
            select: {
              id: true,
              platform: true,
              status: true,
              person: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      }),
      prisma.wallet.count({
        where,
      }),
    ]);

    return {
      data: wallets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWalletByAccountId(
    accountId: bigint | number,
  ) {
    const id = BigInt(accountId);

    const wallet = await prisma.wallet.findFirst({
      where: {
        accountId: id,
        account: {
          platform: {
            in: [
              AccountPlatform.MEMBER,
              AccountPlatform.FRANCHISE,
            ],
          },
        },
      },
      select: {
        id: true,
        accountId: true,
        balance: true,
        createdAt: true,
        updatedAt: true,
        account: {
          select: {
            id: true,
            platform: true,
            status: true,
            person: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phone: true,
              },
            },
            memberProfile: {
              select: {
                referralCode: true,
              },
            },
            franchiseProfile: {
              select: {
                franchiseCode: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }

    return wallet;
  }

  async getTransactions(
    accountId: bigint | number,
  ) {
    const id = BigInt(accountId);

    const wallet = await prisma.wallet.findFirst({
      where: {
        accountId: id,
        account: {
          platform: {
            in: [
              AccountPlatform.MEMBER,
              AccountPlatform.FRANCHISE,
            ],
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!wallet) {
      throw new Error("WALLET_NOT_FOUND");
    }

    return prisma.walletTransaction.findMany({
      where: {
        walletId: wallet.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        walletId: true,
        type: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        description: true,
        createdAt: true,
      },
    });
  }
}

export const adminWalletService =
  new AdminWalletService();
