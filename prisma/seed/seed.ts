
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

const prisma = new PrismaClient({
  adapter,
});


async function clearBusinessData() {
  // 1. Xóa dữ liệu khiếu nại trước tài khoản và AdminAccount.
  await prisma.complaintAttachment.deleteMany();
  await prisma.complaintMessage.deleteMany();
  await prisma.complaintAssignment.deleteMany();
  await prisma.complaintHistory.deleteMany();
  await prisma.complaint.deleteMany();

  // 2. Xóa phiếu điều chỉnh trước giao dịch ví mà phiếu có thể tham chiếu.
  await prisma.financialAdjustment.deleteMany();

  // 3. Xóa giao dịch ngân hàng trước chỉ dẫn thanh toán và tài khoản ngân hàng.
  await prisma.bankTransaction.deleteMany();
  await prisma.paymentInstruction.deleteMany();

  // 4. Xóa các giao dịch tài chính và dữ liệu đơn hàng.
  await prisma.commissionTransaction.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.inventoryIssueItem.deleteMany();
  await prisma.inventoryIssue.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();

  // 5. Xóa dữ liệu nhập kho.
  await prisma.inventoryReceiptItem.deleteMany();
  await prisma.inventoryReceipt.deleteMany();

  // 6. Xóa giỏ hàng và yêu cầu rút tiền trước ví.
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.withdrawalRequest.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.wallet.deleteMany();

  // 7. Xóa quan hệ và hồ sơ trước tài khoản người dùng.
  await prisma.referralRelationship.deleteMany();
  await prisma.memberProfile.deleteMany();
  await prisma.franchiseProfile.deleteMany();
  await prisma.address.deleteMany();
  await prisma.userAccount.deleteMany();
  await prisma.person.deleteMany();

  // 8. Xóa dữ liệu tồn kho và catalog.
  await prisma.inventory.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  // 9. Xóa quy tắc hoa hồng sau các giao dịch sử dụng quy tắc.
  await prisma.commissionRule.deleteMany();

  // 10. Xóa tài khoản ngân hàng sau các giao dịch và chỉ dẫn liên quan.
  await prisma.bankAccount.deleteMany();

  // Không xóa AdminAccount hoặc DemoClockState.
}


async function createWallet(accountId: bigint) {
  await prisma.wallet.create({
    data: {
      accountId,
      balance: 0,
      reservedBalance: 0,
    },
  });
}

async function createVariant(input: {
  productId: bigint;
  sku: string;
  name: string;
  price: number;
  compareAtPrice: number;
  quantity: number;
}) {
  const variant = await prisma.productVariant.create({
    data: {
      productId: input.productId,
      sku: input.sku,
      name: input.name,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      status: "ACTIVE",
    },
  });

  await prisma.inventory.create({
    data: {
      variantId: variant.id,
      quantity: input.quantity,
      reservedQty: 0,
    },
  });

  return variant;
}

async function main() {
  // Explicit confirmation prevents accidental data deletion.
  if (process.env.SEED_ALLOW_RESET !== "true") {
    throw new Error(
      "SEED_RESET_NOT_CONFIRMED: Set SEED_ALLOW_RESET=true before running this seed.",
    );
  }

  const database = process.env.DB_NAME ?? "ecommerce_platform";

  if (database !== "ecommerce_platform") {
    throw new Error(
      `SEED_DATABASE_MISMATCH: Refusing to reset database "${database}".`,
    );
  }

  console.log("🌱 Starting clean database seed...");
  console.log(`📌 Target database: ${database}`);

  // ------------------------------------------------------------
  // 1. Preserve existing Admin accounts
  // ------------------------------------------------------------

  const adminsBefore = await prisma.adminAccount.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      createdById: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.log(
    `🔐 Preserving ${adminsBefore.length} existing Admin account(s).`,
  );

  // ------------------------------------------------------------
  // 2. Clear old business data
  // ------------------------------------------------------------

  await clearBusinessData();

  // ------------------------------------------------------------
  // 3. Shop Bank
  // ------------------------------------------------------------

  await prisma.bankAccount.create({
    data: {
      accountNumber: "DUCKBANK-SHOP-001",
      ownerType: "SHOP",
      ownerAccountId: null,
      balance: 100000000,
      status: "ACTIVE",
    },
  });

  console.log("🏦 Shop Bank created.");

  // ------------------------------------------------------------
  // 3. Commission Rules
  // ------------------------------------------------------------

  await prisma.commissionRule.createMany({
    data: [
      {
        name: "Member Commission - Up to 500K",
        platform: "MEMBER",
        percentage: 0.5,
        thresholdAmount: 500000,
        isActive: true,
      },
      {
        name: "Member Commission - Above 500K",
        platform: "MEMBER",
        percentage: 1,
        thresholdAmount: 500000,
        isActive: true,
      },
      {
        name: "Franchise Commission - Up to 1500K",
        platform: "FRANCHISE",
        percentage: 1.5,
        thresholdAmount: 1500000,
        isActive: true,
      },
      {
        name: "Franchise Commission - Above 1500K",
        platform: "FRANCHISE",
        percentage: 3,
        thresholdAmount: 1500000,
        isActive: true,
      },
    ],
  });

  console.log("💰 Commission rules created: 4 rules.");


  // ------------------------------------------------------------
  // 4. Persons
  // Franchise A and Member A share the same real person.
  // ------------------------------------------------------------

  const [
    personA,
    personFranchiseB,
    personMemberC,
    personMemberD,
    personFranchiseD,
    personFranchiseE,
    personMemberE,
    personMemberF,
    personMemberG,
  ] = await Promise.all([
    prisma.person.create({
      data: {
        fullName: "Nguyen Van A",
        email: "nguyenvana@example.com",
        phone: "0900000001",
      },
    }),
    prisma.person.create({
      data: {
        fullName: "Tran Thi B",
        email: "tranthib@example.com",
        phone: "0900000002",
      },
    }),
    prisma.person.create({
      data: {
        fullName: "Le Van C",
        email: "levanc@example.com",
        phone: "0900000003",
      },
    }),
    prisma.person.create({
      data: {
        fullName: "Pham Thi D",
        email: "phamthid@example.com",
        phone: "0900000004",
      },
    }),
    prisma.person.create({
      data: {
        fullName: "Hoang Van D",
        email: "hoangvand@example.com",
        phone: "0900000005",
      },
    }),
    prisma.person.create({
      data: {
        fullName: "Vo Thi E",
        email: "vothie@example.com",
        phone: "0900000006",
      },
    }),
    prisma.person.create({
      data: {
        fullName: "Nguyen Van E",
        email: "nguyenvane@example.com",
        phone: "0900000007",
      },
    }),
    prisma.person.create({
      data: {
        fullName: "Dang Thi F",
        email: "dangthif@example.com",
        phone: "0900000008",
      },
    }),
    prisma.person.create({
      data: {
        fullName: "Bui Thi G",
        email: "buithig@example.com",
        phone: "0900000009",
      },
    }),
  ]);

  // ------------------------------------------------------------
  // 5. User accounts
  // ------------------------------------------------------------

  const memberPasswordHash = await bcrypt.hash("Member@123456", 12);
  const franchisePasswordHash = await bcrypt.hash(
    "Franchise@123456",
    12,
  );

  const [
    memberA,
    memberC,
    memberD,
    memberE,
    memberF,
    memberG,
    franchiseA,
    franchiseB,
    franchiseD,
    franchiseE,
  ] = await Promise.all([
    prisma.userAccount.create({
      data: {
        personId: personA.id,
        platform: "MEMBER",
        email: "nguyenvana@example.com",
        phone: "0900000001",
        passwordHash: memberPasswordHash,
        status: "ACTIVE",
      },
    }),
    prisma.userAccount.create({
      data: {
        personId: personMemberC.id,
        platform: "MEMBER",
        email: "levanc@example.com",
        phone: "0900000003",
        passwordHash: memberPasswordHash,
        status: "ACTIVE",
      },
    }),
    prisma.userAccount.create({
      data: {
        personId: personMemberD.id,
        platform: "MEMBER",
        email: "phamthid@example.com",
        phone: "0900000004",
        passwordHash: memberPasswordHash,
        status: "ACTIVE",
      },
    }),
    prisma.userAccount.create({
      data: {
        personId: personMemberE.id,
        platform: "MEMBER",
        email: "nguyenvane@example.com",
        phone: "0900000007",
        passwordHash: memberPasswordHash,
        status: "ACTIVE",
      },
    }),
    prisma.userAccount.create({
      data: {
        personId: personMemberF.id,
        platform: "MEMBER",
        email: "dangthif@example.com",
        phone: "0900000008",
        passwordHash: memberPasswordHash,
        status: "ACTIVE",
      },
    }),
    prisma.userAccount.create({
      data: {
        personId: personMemberG.id,
        platform: "MEMBER",
        email: "buithig@example.com",
        phone: "0900000009",
        passwordHash: memberPasswordHash,
        status: "ACTIVE",
      },
    }),
    prisma.userAccount.create({
      data: {
        personId: personA.id,
        platform: "FRANCHISE",
        email: "nguyenvana@example.com",
        phone: "0900000001",
        passwordHash: franchisePasswordHash,
        status: "ACTIVE",
      },
    }),
    prisma.userAccount.create({
      data: {
        personId: personFranchiseB.id,
        platform: "FRANCHISE",
        email: "tranthib@example.com",
        phone: "0900000002",
        passwordHash: franchisePasswordHash,
        status: "ACTIVE",
      },
    }),
    prisma.userAccount.create({
      data: {
        personId: personFranchiseD.id,
        platform: "FRANCHISE",
        email: "hoangvand@example.com",
        phone: "0900000005",
        passwordHash: franchisePasswordHash,
        status: "ACTIVE",
      },
    }),
    prisma.userAccount.create({
      data: {
        personId: personFranchiseE.id,
        platform: "FRANCHISE",
        email: "vothie@example.com",
        phone: "0900000006",
        passwordHash: franchisePasswordHash,
        status: "ACTIVE",
      },
    }),
  ]);

  // ------------------------------------------------------------
  // 6. Profiles
  // ------------------------------------------------------------

  await prisma.memberProfile.createMany({
    data: [
      { accountId: memberA.id, referralCode: "MB000001" },
      { accountId: memberC.id, referralCode: "MB000002" },
      { accountId: memberD.id, referralCode: "MB000003" },
      { accountId: memberE.id, referralCode: "MB000004" },
      { accountId: memberF.id, referralCode: "MB000005" },
      { accountId: memberG.id, referralCode: "MB000006" },
    ],
  });

  await prisma.franchiseProfile.createMany({
    data: [
      {
        accountId: franchiseA.id,
        franchiseCode: "FR000001",
        status: "ACTIVE",
      },
      {
        accountId: franchiseB.id,
        franchiseCode: "FR000002",
        status: "ACTIVE",
      },
      {
        accountId: franchiseD.id,
        franchiseCode: "FR000003",
        status: "ACTIVE",
      },
      {
        accountId: franchiseE.id,
        franchiseCode: "FR000004",
        status: "ACTIVE",
      },
    ],
  });

  // ------------------------------------------------------------
  // 7. Wallets
  // Each UserAccount has its own wallet.
  // Franchise A and Member A have separate wallets.
  // ------------------------------------------------------------

  await Promise.all([
    memberA,
    memberC,
    memberD,
    memberE,
    memberF,
    memberG,
    franchiseA,
    franchiseB,
    franchiseD,
    franchiseE,
  ].map((account) => createWallet(account.id)));

  // ------------------------------------------------------------
  // 8. Referral relationships
  // Only MEMBER accounts can be referral targets.
  // ------------------------------------------------------------

  await prisma.referralRelationship.createMany({
    data: [
      {
        targetAccountId: memberA.id,
        sourceAccountId: null,
        sourceType: "NONE",
      },
      {
        targetAccountId: memberC.id,
        sourceAccountId: franchiseB.id,
        sourceType: "FRANCHISE",
      },
      {
        targetAccountId: memberD.id,
        sourceAccountId: memberC.id,
        sourceType: "MEMBER",
      },
      {
        targetAccountId: memberE.id,
        sourceAccountId: null,
        sourceType: "NONE",
      },
      {
        targetAccountId: memberF.id,
        sourceAccountId: franchiseE.id,
        sourceType: "FRANCHISE",
      },
      {
        targetAccountId: memberG.id,
        sourceAccountId: franchiseE.id,
        sourceType: "FRANCHISE",
      },
    ],
  });

  // ------------------------------------------------------------
  // 9. Addresses
  // Addresses belong to Person, not UserAccount.
  // ------------------------------------------------------------

  await prisma.address.createMany({
    data: [
      {
        personId: personA.id,
        type: "HOME",
        receiverName: "Nguyen Van A",
        phone: "0900000001",
        addressLine: "25 Hang Bong",
        ward: "Hang Bong",
        district: "Hoan Kiem",
        province: "Ha Noi",
        isDefault: true,
      },
      {
        personId: personMemberC.id,
        type: "HOME",
        receiverName: "Le Van C",
        phone: "0900000003",
        addressLine: "120 Nguyen Trai",
        ward: "Thuong Dinh",
        district: "Thanh Xuan",
        province: "Ha Noi",
        isDefault: true,
      },
      {
        personId: personMemberD.id,
        type: "HOME",
        receiverName: "Pham Thi D",
        phone: "0900000004",
        addressLine: "15 Tran Phu",
        ward: "Van Quan",
        district: "Ha Dong",
        province: "Ha Noi",
        isDefault: true,
      },
      {
        personId: personMemberE.id,
        type: "HOME",
        receiverName: "Nguyen Van E",
        phone: "0900000007",
        addressLine: "50 Bach Mai",
        ward: "Bach Mai",
        district: "Hai Ba Trung",
        province: "Ha Noi",
        isDefault: true,
      },
      {
        personId: personMemberF.id,
        type: "HOME",
        receiverName: "Dang Thi F",
        phone: "0900000008",
        addressLine: "80 Cau Giay",
        ward: "Dich Vong",
        district: "Cau Giay",
        province: "Ha Noi",
        isDefault: true,
      },
      {
        personId: personMemberG.id,
        type: "HOME",
        receiverName: "Bui Thi G",
        phone: "0900000009",
        addressLine: "10 Nguyen Van Cu",
        ward: "Bo De",
        district: "Long Bien",
        province: "Ha Noi",
        isDefault: true,
      },
    ],
  });

  // ------------------------------------------------------------
  // 10. Empty carts for MEMBER accounts only
  // ------------------------------------------------------------

  await prisma.cart.createMany({
    data: [
      { accountId: memberA.id },
      { accountId: memberC.id },
      { accountId: memberD.id },
      { accountId: memberE.id },
      { accountId: memberF.id },
      { accountId: memberG.id },
    ],
  });


  // ------------------------------------------------------------
  // 11. Categories
  // Slugs match StorefrontHeader.tsx.
  // 23 unique categories; set-quan-ao is shared by menus.
  // ------------------------------------------------------------


  const categorySeed = [
    { name: "Áo Nam", slug: "ao", description: "Danh mục áo nam." },
    { name: "Áo thun", slug: "ao-thun", description: "Áo thun nam." },
    { name: "Áo polo", slug: "ao-polo", description: "Áo polo nam." },
    { name: "Áo sơ mi", slug: "ao-somi", description: "Áo sơ mi nam." },
    { name: "Áo khoác", slug: "ao-khoac", description: "Áo khoác nam." },
    { name: "Áo nỉ", slug: "ao-ni", description: "Áo nỉ nam." },
    { name: "Hoodies", slug: "hoodies", description: "Hoodie nam." },
    {
      name: "Tank top / Áo ba lỗ",
      slug: "tank-top-ao-ba-lo",
      description: "Áo ba lỗ nam.",
    },
    {
      name: "Set quần áo",
      slug: "set-quan-ao",
      description: "Bộ quần áo nam.",
    },
    { name: "Quần Nam", slug: "quan", description: "Danh mục quần nam." },
    { name: "Quần jean", slug: "quan-jean", description: "Quần jean nam." },
    { name: "Quần short", slug: "quan-short", description: "Quần short nam." },
    { name: "Quần kaki", slug: "quan-kaki", description: "Quần kaki nam." },
    { name: "Jogger", slug: "jogger", description: "Quần jogger nam." },
    { name: "Quần tây", slug: "quan-tay", description: "Quần tây nam." },
    { name: "Quần boxer", slug: "quan-boxer", description: "Quần boxer nam." },
    {
      name: "Giày",
      slug: "phu-kien",
      description: "Danh mục giày và phụ kiện.",
    },
    { name: "Nhóm giày", slug: "nhom-giay", description: "Giày nam." },
    {
      name: "Túi ví balo",
      slug: "tui-vi-balo",
      description: "Túi, ví và balo.",
    },
    { name: "Nón", slug: "non", description: "Nón nam." },
    {
      name: "Thắt lưng",
      slug: "that-lung",
      description: "Thắt lưng nam.",
    },
    { name: "Vớ", slug: "vo", description: "Vớ nam." },
    { name: "Mắt kính", slug: "mat-kinh", description: "Mắt kính." },
  ];


  await prisma.category.createMany({
    data: categorySeed,
  });

  console.log(`Seeded ${categorySeed.length} categories.`);


  // ------------------------------------------------------------
  // 12. Products
  // Seed 3 Áo thun nam products only.
  // Variants and inventory will be added later.
  // ------------------------------------------------------------

  const categoryAoThun = await prisma.category.findUniqueOrThrow({
    where: { slug: "ao-thun" },
  });

  const productSeed = [
    {
      name: "Áo Thun Nam Classic Bear Stripe Form Regular",
      slug: "ao-thun-nam-classic-bear-stripe-form-regular",
      description: "Áo thun nam Classic Bear Stripe form Regular.",
    },
    {
      name: "Áo Thun Nam Arabica Club Form Regular",
      slug: "ao-thun-nam-arabica-club-form-regular",
      description: "Áo thun nam Arabica Club form Regular.",
    },
    {
      name: "Áo Thun Nam Athletic Club Form Regular",
      slug: "ao-thun-nam-athletic-club-form-regular",
      description: "Áo thun nam Athletic Club form Regular.",
    },
  ];

  await prisma.product.createMany({
    data: productSeed.map((product) => ({
      ...product,
      categoryId: categoryAoThun.id,
      status: "ACTIVE" as const,
    })),
  });

  console.log(`Seeded ${productSeed.length} Áo thun nam products.`);



  // ------------------------------------------------------------
  // 14. Verify Admin accounts were preserved
  // ------------------------------------------------------------

  const adminsAfter = await prisma.adminAccount.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      passwordHash: true,
      role: true,
      status: true,
      createdById: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  if (
    JSON.stringify(adminsBefore, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ) !==
    JSON.stringify(adminsAfter, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    )
  ) {
    throw new Error(
      "ADMIN_PRESERVATION_CHECK_FAILED",
    );
  }

  // ------------------------------------------------------------
  // 15. Final counts
  // ------------------------------------------------------------

  const [
    adminCount,
    personCount,
    userAccountCount,
    memberProfileCount,
    franchiseProfileCount,
    walletCount,
    bankAccountCount,
    categoryCount,
    productCount,
    variantCount,
    inventoryCount,
    addressCount,
    cartCount,
    orderCount,
    withdrawalCount,
    commissionTransactionCount,
    paymentInstructionCount,
  ] = await Promise.all([
    prisma.adminAccount.count(),
    prisma.person.count(),
    prisma.userAccount.count(),
    prisma.memberProfile.count(),
    prisma.franchiseProfile.count(),
    prisma.wallet.count(),
    prisma.bankAccount.count(),
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.inventory.count(),
    prisma.address.count(),
    prisma.cart.count(),
    prisma.order.count(),
    prisma.withdrawalRequest.count(),
    prisma.commissionTransaction.count(),
    prisma.paymentInstruction.count(),
  ]);

  console.log("\n📊 CLEAN SEED SUMMARY");
  console.log("------------------------------");
  console.log(`Admin accounts preserved: ${adminCount}`);
  console.log(`Persons: ${personCount}`);
  console.log(`User accounts: ${userAccountCount}`);
  console.log(`Member profiles: ${memberProfileCount}`);
  console.log(`Franchise profiles: ${franchiseProfileCount}`);
  console.log(`Wallets: ${walletCount}`);
  console.log(`Bank accounts: ${bankAccountCount}`);
  console.log(`Categories: ${categoryCount}`);
  console.log(`Products: ${productCount}`);
  console.log(`Variants: ${variantCount}`);
  console.log(`Inventories: ${inventoryCount}`);
  console.log(`Addresses: ${addressCount}`);
  console.log(`Carts: ${cartCount}`);
  console.log(`Orders: ${orderCount}`);
  console.log(`Withdrawals: ${withdrawalCount}`);
  console.log(`Commission transactions: ${commissionTransactionCount}`);
  console.log(`Payment instructions: ${paymentInstructionCount}`);


  console.log("\n👤 DEMO USER CREDENTIALS");
  console.log("------------------------------");
  console.log("MEMBER A: nguyenvana@example.com");
  console.log("MEMBER C: levanc@example.com");
  console.log("MEMBER D: phamthid@example.com");
  console.log("MEMBER E: nguyenvane@example.com");
  console.log("MEMBER F: dangthif@example.com");
  console.log("MEMBER G: buithig@example.com");
  console.log("FRANCHISE A: nguyenvana@example.com");
  console.log("FRANCHISE B: tranthib@example.com");
  console.log("FRANCHISE D: hoangvand@example.com");
  console.log("FRANCHISE E: vothie@example.com");
  console.log("MEMBER password: Member@123456");
  console.log("FRANCHISE password: Franchise@123456");


  console.log("\n✅ Clean database seed completed.");
}


main()
  .catch((error) => {
    console.error("Clean database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
