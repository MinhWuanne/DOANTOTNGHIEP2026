import { prisma } from "../../lib/prisma.js";
import { generateMemberReferralCode } from "../account/member-referral-code.js";
import {
  AccountPlatform,
  BankAccountOwnerType,
  BankAccountStatus,
  FranchiseStatus,
  ReferralSourceType,
  UserStatus,
} from "../../generated/prisma/enums.js";
import { passwordService } from "./password.service.js";
import { jwtService } from "./jwt.service.js";

export interface RegisterMemberInput {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  inviteCode?: string | null;
}

export interface LoginInput {
  email?: string | null;
  phone?: string | null;
  password: string;
}

export class AuthService {
  async registerMember(input: RegisterMemberInput) {
    const fullName =
      typeof input.fullName === "string"
        ? input.fullName.trim()
        : "";

    if (!fullName) {
      throw new Error("FULL_NAME_REQUIRED");
    }

    if (!input.email && !input.phone) {
      throw new Error("EMAIL_OR_PHONE_REQUIRED");
    }

    const passwordHash = await passwordService.hash(
      input.password,
    );

    return prisma.$transaction(async (tx) => {
      // CHECK DUPLICATE EMAIL
      if (input.email) {
        const existingEmail =
          await tx.userAccount.findUnique({
            where: {
              platform_email: {
                platform: AccountPlatform.MEMBER,
                email: input.email,
              },
            },
          });

        if (existingEmail) {
          throw new Error("EMAIL_ALREADY_EXISTS");
        }
      }

      // CHECK DUPLICATE PHONE
      if (input.phone) {
        const existingPhone =
          await tx.userAccount.findUnique({
            where: {
              platform_phone: {
                platform: AccountPlatform.MEMBER,
                phone: input.phone,
              },
            },
          });

        if (existingPhone) {
          throw new Error("PHONE_ALREADY_EXISTS");
        }
      }

      // PERSON IDENTITY
      // Person mới nhận email/phone ngay khi đăng ký.
      const person = await tx.person.create({
        data: {
          fullName,
          email: input.email ?? null,
          phone: input.phone ?? null,
        },
      });

      const referralCode =
        await generateMemberReferralCode(tx);

      const account = await tx.userAccount.create({
        data: {
          personId: person.id,
          platform: AccountPlatform.MEMBER,
          email: input.email ?? null,
          phone: input.phone ?? null,
          passwordHash,
          status: UserStatus.ACTIVE,

          memberProfile: {
            create: {
              referralCode,
            },
          },
        },
        include: {
          person: true,
          memberProfile: true,
        },
      });

      await tx.wallet.create({
        data: {
          accountId: account.id,
          balance: 0,
        },
      });

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

      const inviteCode =
        input.inviteCode?.trim() || null;

      if (inviteCode) {
        let sourceAccountId: bigint | null = null;
        let sourceType: ReferralSourceType =
          ReferralSourceType.NONE;

        let inviteCodeFound = false;

        const memberSource =
          await tx.memberProfile.findUnique({
            where: { referralCode: inviteCode },
            select: { accountId: true },
          });

        if (memberSource) {
          inviteCodeFound = true;
          sourceAccountId = memberSource.accountId;
          sourceType = ReferralSourceType.MEMBER;
        } else {
          const franchiseSource =
            await tx.franchiseProfile.findUnique({
              where: { franchiseCode: inviteCode },
              select: {
                accountId: true,
                status: true,
              },
            });

          if (franchiseSource) {
            inviteCodeFound = true;

            if (
              franchiseSource.status ===
              FranchiseStatus.ACTIVE
            ) {
              sourceAccountId =
                franchiseSource.accountId;
              sourceType =
                ReferralSourceType.FRANCHISE;
            } else {
              // Franchise code vẫn hợp lệ,
              // nhưng Franchise không còn ACTIVE.
              // MEMBER vẫn được đăng ký,
              // referral được neutralized.
              sourceAccountId = null;
              sourceType = ReferralSourceType.NONE;
            }
          }
        }

        if (!inviteCodeFound) {
          throw new Error("INVITE_CODE_NOT_FOUND");
        }

        if (sourceAccountId !== null) {
          const sourceAccount =
            await tx.userAccount.findUnique({
              where: {
                id: sourceAccountId,
              },
              select: {
                id: true,
                personId: true,
                platform: true,
                email: true,
                phone: true,
              },
            });

          if (!sourceAccount) {
            throw new Error("INVITE_CODE_NOT_FOUND");
          }

          // DIRECT SELF-REFERRAL:
          // Same account cannot refer itself.
          if (sourceAccount.id === account.id) {
            throw new Error("SELF_REFERRAL_NOT_ALLOWED");
          }

          // ========================================================
          // CROSS-ACCOUNT SELF-IDENTITY CHECK
          //
          // If the new MEMBER's email OR phone matches the source
          // account, the MEMBER is still created, but the referral
          // loses its referrer.
          //
          // Result:
          // sourceAccountId = null
          // sourceType      = NONE
          // ========================================================

          if (
            (
              input.email &&
              sourceAccount.email &&
              input.email === sourceAccount.email
            ) ||
            (
              input.phone &&
              sourceAccount.phone &&
              input.phone === sourceAccount.phone
            )
          ) {
            sourceAccountId = null;
            sourceType = ReferralSourceType.NONE;
          }
        }

        await tx.referralRelationship.create({
          data: {
            sourceAccountId,
            targetAccountId: account.id,
            sourceType,
          },
        });
      }

      const token = jwtService.sign({
        accountId: account.id.toString(),
        personId: account.personId.toString(),
        platform: account.platform,
      });

      return {
        account: this.sanitizeAccount(account),
        accessToken: token,
      };
    });
  }

  async login(input: LoginInput) {
    if (!input.email && !input.phone) {
      throw new Error("EMAIL_OR_PHONE_REQUIRED");
    }

    const account = input.email
      ? await prisma.userAccount.findUnique({
        where: {
          platform_email: {
            platform: AccountPlatform.MEMBER,
            email: input.email,
          },
        },
        include: {
          person: true,
          memberProfile: true,
        },
      })
      : await prisma.userAccount.findUnique({
        where: {
          platform_phone: {
            platform: AccountPlatform.MEMBER,
            phone: input.phone!,
          },
        },
        include: {
          person: true,
          memberProfile: true,
        },
      });

    if (!account) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (account.status !== UserStatus.ACTIVE) {
      throw new Error("ACCOUNT_NOT_ACTIVE");
    }

    const passwordValid =
      await passwordService.verify(
        input.password,
        account.passwordHash,
      );

    if (!passwordValid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const token = jwtService.sign({
      accountId: account.id.toString(),
      personId: account.personId.toString(),
      platform: account.platform,
    });

    return {
      account: this.sanitizeAccount(account),
      accessToken: token,
    };
  }

  async loginFranchise(input: LoginInput) {
    if (!input.email && !input.phone) {
      throw new Error("EMAIL_OR_PHONE_REQUIRED");
    }

    const account = input.email
      ? await prisma.userAccount.findUnique({
        where: {
          platform_email: {
            platform: AccountPlatform.FRANCHISE,
            email: input.email,
          },
        },
        include: {
          person: true,
          franchiseProfile: true,
        },
      })
      : await prisma.userAccount.findUnique({
        where: {
          platform_phone: {
            platform: AccountPlatform.FRANCHISE,
            phone: input.phone!,
          },
        },
        include: {
          person: true,
          franchiseProfile: true,
        },
      });

    if (!account) {
      throw new Error("INVALID_CREDENTIALS");
    }

    if (account.status !== UserStatus.ACTIVE) {
      throw new Error("ACCOUNT_NOT_ACTIVE");
    }

    const passwordValid =
      await passwordService.verify(
        input.password,
        account.passwordHash,
      );

    if (!passwordValid) {
      throw new Error("INVALID_CREDENTIALS");
    }

    const token = jwtService.sign({
      accountId: account.id.toString(),
      personId: account.personId.toString(),
      platform: account.platform,
    });

    return {
      account: this.sanitizeAccount(account),
      accessToken: token,
    };
  }

  private sanitizeAccount(account: any) {
    const {
      passwordHash: _passwordHash,
      ...safeAccount
    } = account;

    return safeAccount;
  }
}

export const authService = new AuthService();