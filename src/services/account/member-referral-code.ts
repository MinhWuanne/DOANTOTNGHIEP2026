import { PrismaClient } from "../../generated/prisma/client.js";

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

export async function generateMemberReferralCode(
  tx: PrismaTransactionClient,
): Promise<string> {
  const members = await tx.memberProfile.findMany({
    select: {
      referralCode: true,
    },
  });

  let maxNumber = 0;

  for (const member of members) {
    const match = /^MB(\d{6})$/.exec(member.referralCode);

    if (match) {
      const number = Number(match[1]);

      if (number > maxNumber) {
        maxNumber = number;
      }
    }
  }

  const nextNumber = maxNumber + 1;

  if (nextNumber > 999999) {
    throw new Error("MEMBER_REFERRAL_CODE_EXHAUSTED");
  }

  return `MB${String(nextNumber).padStart(6, "0")}`;
}