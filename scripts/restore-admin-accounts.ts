
import "dotenv/config";

import { prisma } from "../src/lib/prisma.js";
import { passwordService } from "../src/services/auth/password.service.js";
import {
  AdminRole,
  AdminStatus,
} from "../src/generated/prisma/enums.js";

async function main() {
  const superAdminPassword = process.env.S_AD_SEED_PASSWORD;
  const adminPassword = process.env.AD_SEED_PASSWORD;

  if (!superAdminPassword || !adminPassword) {
    throw new Error("ADMIN_PASSWORD_ENV_MISSING");
  }

  if (superAdminPassword.length < 8 || adminPassword.length < 8) {
    throw new Error("ADMIN_PASSWORD_TOO_SHORT");
  }

  const accounts = [
    {
      username: "s_ad",
      email: "sad@ecommerce.local",
    },
    {
      username: "ad",
      email: "ad@ecommerce.local",
    },
    {
      username: "ad1",
      email: "ad1@ecommerce.local",
    },
  ];

  try {
    await prisma.$transaction(async (tx) => {
      // Chỉ tạo tài khoản khi không có username/email nào bị chiếm.
      const existing = await tx.adminAccount.findMany({
        where: {
          OR: [
            { username: { in: accounts.map((a) => a.username) } },
            { email: { in: accounts.map((a) => a.email) } },
          ],
        },
        select: {
          username: true,
          email: true,
        },
      });

      if (existing.length > 0) {
        throw new Error(
          `ADMIN_ACCOUNT_CONFLICT: ${existing
            .map((a) => a.username)
            .join(", ")}`,
        );
      }

      const superAdmin = await tx.adminAccount.create({
        data: {
          username: "s_ad",
          email: "sad@ecommerce.local",
          passwordHash: await passwordService.hash(superAdminPassword),
          role: AdminRole.SUPER_ADMIN,
          status: AdminStatus.ACTIVE,
          createdById: null,
        },
      });

      await tx.adminAccount.createMany({
        data: [
          {
            username: "ad",
            email: "ad@ecommerce.local",
            passwordHash: await passwordService.hash(adminPassword),
            role: AdminRole.ADMIN,
            status: AdminStatus.ACTIVE,
            createdById: superAdmin.id,
          },
          {
            username: "ad1",
            email: "ad1@ecommerce.local",
            passwordHash: await passwordService.hash(adminPassword),
            role: AdminRole.ADMIN,
            status: AdminStatus.ACTIVE,
            createdById: superAdmin.id,
          },
        ],
      });
    });

    const result = await prisma.adminAccount.findMany({
      select: {
        username: true,
        email: true,
        role: true,
        status: true,
        createdById: true,
      },
      orderBy: { id: "asc" },
    });

    console.table(
      result.map((account) => ({
        ...account,
        createdById: account.createdById?.toString() ?? null,
      })),
    );

    console.log("ADMIN_ACCOUNT_RESTORE_SUCCESS");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "ADMIN_ACCOUNT_RESTORE_FAILED:",
    error instanceof Error ? error.message : "UNKNOWN_ERROR",
  );
  process.exitCode = 1;
});
