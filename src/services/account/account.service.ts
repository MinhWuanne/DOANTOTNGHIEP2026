import { prisma } from "../../lib/prisma.js";
import { generateMemberReferralCode } from "./member-referral-code.js";
import {
  AccountPlatform,
  BankAccountOwnerType,
  BankAccountStatus,
  UserStatus,
} from "../../generated/prisma/enums.js";

export interface CreateAccountInput {
  personId: bigint | number;
  platform: AccountPlatform;
  email?: string | null;
  phone?: string | null;
  passwordHash: string;
  franchiseCode?: string;
}

export class AccountService {
  async createAccount(input: CreateAccountInput) {
    return prisma.$transaction(async (tx) => {
      const person = await tx.person.findUnique({
        where: {
          id: input.personId,
        },
      });

      if (!person) {
        throw new Error("PERSON_NOT_FOUND");
      }

      const existingAccount = await tx.userAccount.findUnique({
        where: {
          personId_platform: {
            personId: input.personId,
            platform: input.platform,
          },
        },
      });

      if (existingAccount) {
        throw new Error("ACCOUNT_ALREADY_EXISTS_FOR_PLATFORM");
      }

      if (
        input.platform === AccountPlatform.FRANCHISE &&
        !input.franchiseCode
      ) {
        throw new Error("FRANCHISE_CODE_REQUIRED");
      }

      if (input.platform === AccountPlatform.FRANCHISE) {
        const existingFranchise =
          await tx.franchiseProfile.findUnique({
            where: {
              franchiseCode: input.franchiseCode,
            },
          });

        if (existingFranchise) {
          throw new Error("FRANCHISE_CODE_ALREADY_EXISTS");
        }
      }

      /*
       * Person ↔ Account identity synchronization
       *
       * Rule 1:
       * Person mới → identity được set khi Person được tạo.
       *
       * Rule 2:
       * Person identity NULL → bổ sung từ Account.
       *
       * Rule 3:
       * Person đã có identity khác → từ chối tạo Account.
       *
       * Nếu Account không truyền email/phone nhưng Person đã có,
       * Account sẽ kế thừa identity từ Person.
       */

      if (
        person.email !== null &&
        input.email !== undefined &&
        input.email !== null &&
        person.email !== input.email
      ) {
        throw new Error("PERSON_EMAIL_MISMATCH");
      }

      if (
        person.phone !== null &&
        input.phone !== undefined &&
        input.phone !== null &&
        person.phone !== input.phone
      ) {
        throw new Error("PERSON_PHONE_MISMATCH");
      }

      const personEmail =
        person.email ?? input.email ?? null;

      const personPhone =
        person.phone ?? input.phone ?? null;

      if (
        person.email !== personEmail ||
        person.phone !== personPhone
      ) {
        await tx.person.update({
          where: {
            id: person.id,
          },
          data: {
            email: personEmail,
            phone: personPhone,
          },
        });
      }

      const accountEmail =
        input.email ?? personEmail;

      const accountPhone =
        input.phone ?? personPhone;

      const memberReferralCode =
        input.platform === AccountPlatform.MEMBER
          ? await generateMemberReferralCode(tx)
          : undefined;

      const account = await tx.userAccount.create({
        data: {
          person: {
            connect: {
              id: input.personId,
            },
          },
          platform: input.platform,
          email: accountEmail,
          phone: accountPhone,
          passwordHash: input.passwordHash,
          status: UserStatus.ACTIVE,

          ...(input.platform === AccountPlatform.MEMBER
            ? {
              memberProfile: {
                create: {
                  referralCode: memberReferralCode!,
                },
              },
            }
            : {
              franchiseProfile: {
                create: {
                  franchiseCode: input.franchiseCode!,
                },
              },
            }),
        },
      });

      await tx.wallet.create({
        data: {
          accountId: account.id,
          balance: 0,
        },
      });

      if (input.platform === AccountPlatform.MEMBER) {
        await tx.bankAccount.create({
          data: {
            accountNumber: `DUCKBANK-${Date.now()}-${Math.floor(
              Math.random() * 100000,
            )}`,
            ownerType: BankAccountOwnerType.USER,
            ownerAccountId: account.id,
            balance: 0,
            status: BankAccountStatus.ACTIVE,
          },
        });
      }

      return tx.userAccount.findUniqueOrThrow({
        where: {
          id: account.id,
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
          wallet: true,
        },
      });
    });
  }

  async getAccountById(id: bigint | number) {
    return prisma.userAccount.findUnique({
      where: {
        id,
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
        wallet: true,
      },
    });
  }

  async getAccountByPersonAndPlatform(
    personId: bigint | number,
    platform: AccountPlatform,
  ) {
    return prisma.userAccount.findUnique({
      where: {
        personId_platform: {
          personId,
          platform,
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
        wallet: true,
      },
    });
  }
}

export const accountService = new AccountService();