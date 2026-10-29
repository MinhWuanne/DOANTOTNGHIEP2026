import { prisma } from "../src/lib/prisma.js";

async function main() {
  const [variant, address, instructions, walletTransactions] =
    await Promise.all([
      prisma.productVariant.findUnique({
        where: { id: 676n },
        include: {
          product: {
            include: { category: true },
          },
          inventory: true,
          _count: {
            select: {
              orderItems: true,
              inventoryIssueItems: true,
            },
          },
        },
      }),
      prisma.address.findUnique({
        where: { id: 914n },
      }),
      prisma.paymentInstruction.findMany({
        where: {
          OR: [
            { orderId: 2203n },
            { accountId: { in: [3157n, 3158n] } },
          ],
        },
      }),
      prisma.walletTransaction.findMany({
        where: {
          wallet: {
            accountId: { in: [3157n, 3158n] },
          },
        },
      }),
    ]);

  console.log(
    JSON.stringify(
      { variant, address, instructions, walletTransactions },
      (_, value) => typeof value === "bigint" ? value.toString() : value,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
