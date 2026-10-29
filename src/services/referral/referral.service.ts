import { prisma } from "../../lib/prisma.js";
import {
  AccountPlatform,
  FranchiseStatus,
  ReferralSourceType,
} from "../../generated/prisma/enums.js";

export interface CreateReferralInput {
  sourceAccountId: bigint | number | null;
  targetAccountId: bigint | number;
}

const safeAccountSelect = {
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
} as const;

export class ReferralService {
  async createReferral(input: CreateReferralInput) {
    const targetAccountId = BigInt(input.targetAccountId);

    // ============================================================
    // 1. TARGET ACCOUNT
    // ============================================================

    const targetAccount = await prisma.userAccount.findUnique({
      where: {
        id: targetAccountId,
      },
      select: {
        id: true,
        personId: true,
        platform: true,
      },
    });

    if (!targetAccount) {
      throw new Error("TARGET_ACCOUNT_NOT_FOUND");
    }

    // Referral chỉ áp dụng cho Member.
    // Franchise không thể là target của Referral.
    if (targetAccount.platform !== AccountPlatform.MEMBER) {
      throw new Error("REFERRAL_TARGET_MUST_BE_MEMBER");
    }

    // ============================================================
    // 2. DEFAULT: SOURCE = NONE
    //
    // Không có source hợp lệ:
    // - sourceAccountId = NULL
    // - sourceType = NONE
    //
    // Trường hợp này vẫn có thể tạo ReferralRelationship để
    // xác nhận target đã được xử lý referral và không thuộc
    // tuyến của bất kỳ source nào.
    // ============================================================

    let sourceAccountId: bigint | null = null;

    let sourceType: ReferralSourceType =
      ReferralSourceType.NONE;

    // ============================================================
    // 3. SOURCE ACCOUNT
    // ============================================================

    if (
      input.sourceAccountId !== null &&
      input.sourceAccountId !== undefined
    ) {
      sourceAccountId = BigInt(input.sourceAccountId);

      // ----------------------------------------------------------
      // 3.1 SELF REFERRAL - SAME ACCOUNT
      // ----------------------------------------------------------

      if (sourceAccountId === targetAccountId) {
        throw new Error("SELF_REFERRAL_NOT_ALLOWED");
      }

      // ----------------------------------------------------------
      // 3.2 FIND SOURCE ACCOUNT
      // ----------------------------------------------------------

      const sourceAccount =
        await prisma.userAccount.findUnique({
          where: {
            id: sourceAccountId,
          },
          select: {
            id: true,
            personId: true,
            platform: true,

            franchiseProfile: {
              select: {
                status: true,
              },
            },
          },
        });

      if (!sourceAccount) {
        throw new Error("SOURCE_ACCOUNT_NOT_FOUND");
      }

      // ----------------------------------------------------------
      // 3.3 DETERMINE SOURCE TYPE
      // ----------------------------------------------------------

      if (
        sourceAccount.platform === AccountPlatform.MEMBER
      ) {
        // MEMBER → MEMBER
        sourceType = ReferralSourceType.MEMBER;
      } else if (
        sourceAccount.platform ===
        AccountPlatform.FRANCHISE
      ) {
        // --------------------------------------------------------
        // FRANCHISE → MEMBER
        //
        // Chỉ Franchise có quyền hoạt động ACTIVE mới được
        // làm source của referral mới.
        //
        // Nếu Franchise đã SUSPENDED / LOCKED / TERMINATED:
        // - Không báo lỗi đăng ký.
        // - Triệt tiêu referral.
        // - Giữ MEMBER được tạo bình thường.
        // --------------------------------------------------------

        if (
          sourceAccount.franchiseProfile?.status !==
          FranchiseStatus.ACTIVE
        ) {
          sourceAccountId = null;
          sourceType = ReferralSourceType.NONE;
        } else {
          sourceType = ReferralSourceType.FRANCHISE;
        }
      }
    }

    // ============================================================
    // 4. TARGET MUST NOT ALREADY HAVE A REFERRER
    // ============================================================

    const existingReferral =
      await prisma.referralRelationship.findUnique({
        where: {
          targetAccountId,
        },
      });

    if (existingReferral) {
      throw new Error("TARGET_ALREADY_HAS_REFERRER");
    }

    // ============================================================
    // 5. CREATE REFERRAL RELATIONSHIP
    // ============================================================

    return prisma.referralRelationship.create({
      data: {
        sourceAccountId,
        targetAccountId,
        sourceType,
      },
      select: {
        id: true,
        targetAccountId: true,
        sourceAccountId: true,
        sourceType: true,
        createdAt: true,

        sourceAccount: {
          select: safeAccountSelect,
        },

        targetAccount: {
          select: safeAccountSelect,
        },
      },
    });
  }

  // ==============================================================
  // GET REFERRAL BY TARGET ACCOUNT
  // ==============================================================

  async getReferralByTargetAccountId(
    targetAccountId: bigint | number,
  ) {
    return prisma.referralRelationship.findUnique({
      where: {
        targetAccountId: BigInt(targetAccountId),
      },
      select: {
        id: true,
        targetAccountId: true,
        sourceAccountId: true,
        sourceType: true,
        createdAt: true,

        sourceAccount: {
          select: safeAccountSelect,
        },

        targetAccount: {
          select: safeAccountSelect,
        },
      },
    });
  }

  // ==============================================================
  // GET REFERRAL BY ID
  // ==============================================================

  async getReferralById(id: bigint | number) {
    return prisma.referralRelationship.findUnique({
      where: {
        id: BigInt(id),
      },
      select: {
        id: true,
        targetAccountId: true,
        sourceAccountId: true,
        sourceType: true,
        createdAt: true,

        sourceAccount: {
          select: safeAccountSelect,
        },

        targetAccount: {
          select: safeAccountSelect,
        },
      },
    });
  }
}

export const referralService = new ReferralService();