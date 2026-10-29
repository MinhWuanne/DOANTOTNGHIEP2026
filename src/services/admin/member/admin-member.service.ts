import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import {
  AccountPlatform,
  UserStatus,
  ReferralSourceType,
} from "../../../generated/prisma/enums.js";

export interface UpdateAdminMemberInput {
  fullName?: string;
  email?: string;
  phone?: string;
}

const adminMemberSelect = {
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

  referralReceived: {
    select: {
      id: true,
      sourceAccountId: true,
      sourceType: true,
      createdAt: true,

      sourceAccount: {
        select: {
          id: true,
          platform: true,
          email: true,
          phone: true,
          status: true,

          person: {
            select: {
              id: true,
              fullName: true,
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
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserAccountSelect;

export class AdminMemberService {
  async getMembers() {
    return prisma.userAccount.findMany({
      where: {
        platform: AccountPlatform.MEMBER,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: adminMemberSelect,
    });
  }

  async getMemberById(id: bigint | number) {
    const member = await prisma.userAccount.findFirst({
      where: {
        id,
        platform: AccountPlatform.MEMBER,
      },
      select: adminMemberSelect,
    });

    if (!member) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    return member;
  }

  async getMemberReferralTree(id: bigint) {
    const member = await prisma.userAccount.findFirst({
      where: {
        id,
        platform: AccountPlatform.MEMBER,
      },
      select: {
        id: true,
      },
    });

    if (!member) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    // Get direct descendants only for display.
    const directRelationships =
      await prisma.referralRelationship.findMany({
        where: {
          sourceAccountId: id,
          sourceType: ReferralSourceType.MEMBER,
          targetAccount: {
            is: {
              platform: AccountPlatform.MEMBER,
            },
          },
        },
        select: {
          createdAt: true,
          targetAccount: {
            select: {
              id: true,
              email: true,
              phone: true,
              status: true,
              createdAt: true,
              person: {
                select: {
                  fullName: true,
                },
              },
              memberProfile: {
                select: {
                  referralCode: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    // Count all descendants by traversing each referral level.
    // Only the direct descendants are returned to the frontend.
    const visited = new Set<string>([id.toString()]);
    let frontier: bigint[] = [id];

    while (frontier.length > 0) {
      const relationships =
        await prisma.referralRelationship.findMany({
          where: {
            sourceAccountId: {
              in: frontier,
            },
            sourceType: ReferralSourceType.MEMBER,
            targetAccount: {
              is: {
                platform: AccountPlatform.MEMBER,
              },
            },
          },
          select: {
            targetAccountId: true,
          },
        });

      const nextFrontier: bigint[] = [];

      for (const relationship of relationships) {
        const descendantId =
          relationship.targetAccountId.toString();

        if (visited.has(descendantId)) {
          continue;
        }

        visited.add(descendantId);
        nextFrontier.push(
          relationship.targetAccountId,
        );
      }

      frontier = nextFrontier;
    }

    const directMembers = directRelationships.map(
      (relationship) => {
        const account = relationship.targetAccount;

        return {
          id: account.id.toString(),
          fullName: account.person.fullName,
          referralCode:
            account.memberProfile?.referralCode ?? null,
          email: account.email,
          phone: account.phone,
          status: account.status,
          createdAt: account.createdAt,
          referredAt: relationship.createdAt,
        };
      },
    );

    return {
      memberId: id.toString(),
      directCount: directMembers.length,
      totalDescendantCount: visited.size - 1,
      directMembers,
    };
  }

  async updateMember(
    id: bigint | number,
    input: UpdateAdminMemberInput,
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
        const member = await tx.userAccount.findFirst({
          where: {
            id,
            platform: AccountPlatform.MEMBER,
          },
          select: {
            id: true,
            personId: true,
          },
        });

        if (!member) {
          throw new Error("MEMBER_NOT_FOUND");
        }

        if (fullName !== undefined) {
          await tx.person.update({
            where: {
              id: member.personId,
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
              id: member.id,
            },
            data: accountData,
          });
        }

        return tx.userAccount.findFirstOrThrow({
          where: {
            id: member.id,
            platform: AccountPlatform.MEMBER,
          },
          select: adminMemberSelect,
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
          errorText.includes(
            "platform_phone",
          ) ||
          errorText.includes(
            "user_accounts_platform_phone_key",
          )
        ) {
          throw new Error(
            "PHONE_ALREADY_EXISTS",
          );
        }

        if (
          errorText.includes("email") ||
          errorText.includes(
            "platform_email",
          ) ||
          errorText.includes(
            "user_accounts_platform_email_key",
          )
        ) {
          throw new Error(
            "EMAIL_ALREADY_EXISTS",
          );
        }

        if (
          email !== undefined &&
          phone === undefined
        ) {
          throw new Error(
            "EMAIL_ALREADY_EXISTS",
          );
        }

        if (
          phone !== undefined &&
          email === undefined
        ) {
          throw new Error(
            "PHONE_ALREADY_EXISTS",
          );
        }

        throw new Error(
          "DUPLICATE_MEMBER_DATA",
        );
      }

      throw error;
    }
  }

  async lockMember(id: bigint | number) {
    const affectedRows =
      await prisma.userAccount.updateMany({
        where: {
          id,
          platform: AccountPlatform.MEMBER,
          status: UserStatus.ACTIVE,
        },
        data: {
          status: UserStatus.LOCKED,
        },
      });

    if (affectedRows.count === 0) {
      const member =
        await prisma.userAccount.findFirst({
          where: {
            id,
            platform: AccountPlatform.MEMBER,
          },
          select: {
            status: true,
          },
        });

      if (!member) {
        throw new Error("MEMBER_NOT_FOUND");
      }

      if (
        member.status === UserStatus.LOCKED
      ) {
        throw new Error(
          "MEMBER_ALREADY_LOCKED",
        );
      }

      throw new Error(
        "INVALID_MEMBER_STATUS",
      );
    }

    return prisma.userAccount.findFirstOrThrow({
      where: {
        id,
        platform: AccountPlatform.MEMBER,
      },
      select: adminMemberSelect,
    });
  }

  async unlockMember(id: bigint | number) {
    const affectedRows =
      await prisma.userAccount.updateMany({
        where: {
          id,
          platform: AccountPlatform.MEMBER,
          status: UserStatus.LOCKED,
        },
        data: {
          status: UserStatus.ACTIVE,
        },
      });

    if (affectedRows.count === 0) {
      const member =
        await prisma.userAccount.findFirst({
          where: {
            id,
            platform: AccountPlatform.MEMBER,
          },
          select: {
            status: true,
          },
        });

      if (!member) {
        throw new Error("MEMBER_NOT_FOUND");
      }

      if (
        member.status === UserStatus.ACTIVE
      ) {
        throw new Error(
          "MEMBER_ALREADY_ACTIVE",
        );
      }

      throw new Error(
        "INVALID_MEMBER_STATUS",
      );
    }

    return prisma.userAccount.findFirstOrThrow({
      where: {
        id,
        platform: AccountPlatform.MEMBER,
      },
      select: adminMemberSelect,
    });
  }
}

export const adminMemberService =
  new AdminMemberService();