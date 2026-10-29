
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const orderId = 2203n;
  const issueId = 118n;
  const commissionId = 459n;
  const referralId = 532n;

  const [order, orderItems, inventoryIssue, issueItems, commission, referral] =
    await Promise.all([
      prisma.order.findUnique({
        where: { id: orderId },
      }),
      prisma.orderItem.findMany({
        where: { orderId },
      }),
      prisma.inventoryIssue.findUnique({
        where: { id: issueId },
      }),
      prisma.inventoryIssueItem.findMany({
        where: { issueId },
      }),
      prisma.commissionTransaction.findUnique({
        where: { id: commissionId },
      }),
      prisma.referralRelationship.findUnique({
        where: { id: referralId },
      }),
    ]);

  console.log(
    JSON.stringify(
      { order, orderItems, inventoryIssue, issueItems, commission, referral },
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
