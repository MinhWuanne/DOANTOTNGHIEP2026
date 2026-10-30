
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "../../src/generated/prisma/client.js";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const adapter = new PrismaMariaDb({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "ecommerce_platform",
  connectionLimit: 5,
});

const prisma = new PrismaClient({ adapter });

type Platform = "MEMBER" | "FRANCHISE";
type SourceType = "MEMBER" | "FRANCHISE";

type PersonSeed = {
  key: string;
  name: string;
  email: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
};

type UserSeed = {
  key: string;
  personKey: string;
  platform: Platform;
  code: string;
  source?: string;
  sourceType?: SourceType;
};

const people: PersonSeed[] = [
  {
    key: "A",
    name: "Demo Person A",
    email: "demo.personA@example.com",
    phone: "0988000001",
    addressLine: "Số 10 Hàng Bông",
    ward: "Hàng Bông",
    district: "Hoàn Kiếm",
  },
  {
    key: "B",
    name: "Demo Person B",
    email: "demo.personB@example.com",
    phone: "0988000002",
    addressLine: "Số 20 Nguyễn Trãi",
    ward: "Thượng Đình",
    district: "Thanh Xuân",
  },
  {
    key: "C",
    name: "Demo Person C",
    email: "demo.personC@example.com",
    phone: "0988000003",
    addressLine: "Số 30 Trần Phú",
    ward: "Văn Quán",
    district: "Hà Đông",
  },
  {
    key: "D",
    name: "Demo Person D",
    email: "demo.personD@example.com",
    phone: "0988000004",
    addressLine: "Số 40 Bạch Mai",
    ward: "Bạch Mai",
    district: "Hai Bà Trưng",
  },
  {
    key: "E",
    name: "Demo Person E",
    email: "demo.personE@example.com",
    phone: "0988000005",
    addressLine: "Số 50 Cầu Giấy",
    ward: "Dịch Vọng",
    district: "Cầu Giấy",
  },
  {
    key: "F",
    name: "Demo Person F",
    email: "demo.personF@example.com",
    phone: "0988000006",
    addressLine: "Số 60 Nguyễn Văn Cừ",
    ward: "Bồ Đề",
    district: "Long Biên",
  },
  {
    key: "G",
    name: "Demo Person G",
    email: "demo.personG@example.com",
    phone: "0988000007",
    addressLine: "Số 70 Kim Mã",
    ward: "Kim Mã",
    district: "Ba Đình",
  },
];

const users: UserSeed[] = [
  {
    key: "FR01",
    personKey: "A",
    platform: "FRANCHISE",
    code: "FR-DEMO-01",
  },
  {
    key: "FR02",
    personKey: "B",
    platform: "FRANCHISE",
    code: "FR-DEMO-02",
  },
  {
    key: "FR05",
    personKey: "E",
    platform: "FRANCHISE",
    code: "FR-DEMO-05",
  },
  {
    key: "MB01",
    personKey: "A",
    platform: "MEMBER",
    code: "MB-DEMO-01",
    source: "FR02",
    sourceType: "FRANCHISE",
  },
  {
    key: "MB02",
    personKey: "B",
    platform: "MEMBER",
    code: "MB-DEMO-02",
    source: "FR05",
    sourceType: "FRANCHISE",
  },
  {
    key: "MB03",
    personKey: "C",
    platform: "MEMBER",
    code: "MB-DEMO-03",
    source: "MB01",
    sourceType: "MEMBER",
  },
  {
    key: "MB04",
    personKey: "D",
    platform: "MEMBER",
    code: "MB-DEMO-04",
    source: "MB01",
    sourceType: "MEMBER",
  },
  {
    key: "MB05",
    personKey: "F",
    platform: "MEMBER",
    code: "MB-DEMO-05",
    source: "FR05",
    sourceType: "FRANCHISE",
  },
  {
    key: "MB06",
    personKey: "G",
    platform: "MEMBER",
    code: "MB-DEMO-06",
    source: "FR05",
    sourceType: "FRANCHISE",
  },
];

async function main() {
  const database = process.env.DB_NAME;

  if (!database) {
    throw new Error("DB_NAME is missing.");
  }

  console.log(`Target database: ${database}`);

  const memberPasswordHash = await bcrypt.hash("Member@123456", 12);
  const franchisePasswordHash = await bcrypt.hash(
    "Franchise@123456",
    12,
  );

  await prisma.$transaction(
    async (tx) => {
      const emails = [...new Set(people.map((person) => person.email))];
      const phones = [...new Set(people.map((person) => person.phone))];

      const memberCodes = users
        .filter((user) => user.platform === "MEMBER")
        .map((user) => user.code);

      const franchiseCodes = users
        .filter((user) => user.platform === "FRANCHISE")
        .map((user) => user.code);

      const existingAccounts = await tx.userAccount.findMany({
        where: {
          OR: [
            { email: { in: emails } },
            { phone: { in: phones } },
          ],
        },
        select: { id: true },
      });

      const existingMembers = await tx.memberProfile.findMany({
        where: { referralCode: { in: memberCodes } },
        select: { id: true },
      });

      const existingFranchises = await tx.franchiseProfile.findMany({
        where: { franchiseCode: { in: franchiseCodes } },
        select: { id: true },
      });

      if (
        existingAccounts.length > 0 ||
        existingMembers.length > 0 ||
        existingFranchises.length > 0
      ) {
        throw new Error(
          "Demo accounts already exist or identifiers are in use. No data was created.",
        );
      }

      const personIds = new Map<string, bigint>();
      const accountIds = new Map<string, bigint>();

      // 1. Create each Person exactly once.
      for (const person of people) {
        const createdPerson = await tx.person.create({
          data: {
            fullName: person.name,
            email: person.email,
            phone: person.phone,
          },
        });

        personIds.set(person.key, createdPerson.id);

        await tx.address.create({
          data: {
            personId: createdPerson.id,
            type: "HOME",
            receiverName: person.name,
            phone: person.phone,
            addressLine: person.addressLine,
            ward: person.ward,
            district: person.district,
            province: "Hà Nội",
            isDefault: true,
          },
        });
      }

      // 2. Create accounts and attach them to their Person.
      for (const user of users) {
        const personId = personIds.get(user.personKey);

        if (!personId) {
          throw new Error(`Person not found: ${user.personKey}`);
        }

        const person = people.find(
          (item) => item.key === user.personKey,
        );

        if (!person) {
          throw new Error(`Person data not found: ${user.personKey}`);
        }

        const account = await tx.userAccount.create({
          data: {
            personId,
            platform: user.platform,
            email: person.email,
            phone: person.phone,
            passwordHash:
              user.platform === "MEMBER"
                ? memberPasswordHash
                : franchisePasswordHash,
            status: "ACTIVE",
          },
        });

        accountIds.set(user.key, account.id);

        if (user.platform === "MEMBER") {
          await tx.memberProfile.create({
            data: {
              accountId: account.id,
              referralCode: user.code,
            },
          });
        } else {
          await tx.franchiseProfile.create({
            data: {
              accountId: account.id,
              franchiseCode: user.code,
              status: "ACTIVE",
            },
          });
        }

        await tx.wallet.create({
          data: {
            accountId: account.id,
            balance: 0,
            reservedBalance: 0,
          },
        });
      }

      // 3. Create referral relationships between accounts.
      for (const user of users) {
        if (user.platform !== "MEMBER") continue;

        const targetAccountId = accountIds.get(user.key);

        if (!targetAccountId) {
          throw new Error(`Target account not found: ${user.key}`);
        }

        const sourceAccountId = user.source
          ? accountIds.get(user.source)
          : null;

        if (user.source && !sourceAccountId) {
          throw new Error(`Source account not found: ${user.source}`);
        }

        await tx.referralRelationship.create({
          data: {
            targetAccountId,
            sourceAccountId: sourceAccountId ?? null,
            sourceType: user.sourceType ?? "NONE",
          },
        });
      }
    },
    { timeout: 60_000 },
  );

  console.log("Demo data created successfully.");
  console.log("Persons: 7");
  console.log("Franchise accounts: 3");
  console.log("Member accounts: 6");
  console.log("Total accounts: 9");
  console.log("Wallets: 9");
  console.log("Addresses: 7");
  console.log("Referral relationships: 6");
}

main()
  .catch((error) => {
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
