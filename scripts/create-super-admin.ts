import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { passwordService } from "../src/services/auth/password.service.js";
import { AdminRole, AdminStatus } from "../src/generated/prisma/enums.js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

function readHiddenPassword(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
      reject(new Error("Hidden password input requires an interactive terminal."));
      return;
    }

    stdout.write("Super Admin password (min 12 characters): ");
    let password = "";

    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    const onData = (data: Buffer) => {
      for (const char of data.toString("utf8")) {
        if (char === "\u0003") {
          cleanup();
          stdout.write("\nCancelled.\n");
          reject(new Error("Password input cancelled."));
          return;
        }

        if (char === "\r" || char === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(password);
          return;
        }

        if (char === "\u0008" || char === "\u007f") {
          password = password.slice(0, -1);
          continue;
        }

        if (char >= " " && char !== "\u007f") {
          password += char;
        }
      }
    };

    stdin.resume();
    stdin.setRawMode(true);
    stdin.on("data", onData);
  });
}

async function main() {
  const existingCount = await prisma.adminAccount.count();

  if (existingCount > 0) {
    throw new Error(
      "Admin accounts already exist. Refusing to create the initial Super Admin.",
    );
  }

  const rl = createInterface({ input: stdin, output: stdout });
  let username: string;
  let email: string;

  try {
    username = (await rl.question("Super Admin username: ")).trim();
    email = (await rl.question("Super Admin email: ")).trim().toLowerCase();
  } finally {
    rl.close();
  }

  const password = await readHiddenPassword();

  if (!username || !email || password.length < 12) {
    throw new Error(
      "Username/email are required; password must be at least 12 characters.",
    );
  }

  const passwordHash = await passwordService.hash(password);

  const admin = await prisma.adminAccount.create({
    data: {
      username,
      email,
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      status: AdminStatus.ACTIVE,
      createdById: null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      status: true,
    },
  });

  console.log("Super Admin created:", {
    ...admin,
    id: admin.id.toString(),
  });
}

main()
  .catch((error) => {
    console.error("Could not create Super Admin:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
