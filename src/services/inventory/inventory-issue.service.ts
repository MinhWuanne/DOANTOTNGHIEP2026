import { PrismaClient } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { OrderStatus } from "../../generated/prisma/enums.js";

type PrismaTransactionClient = Parameters<
  Parameters<PrismaClient["$transaction"]>[0]
>[0];

export class InventoryIssueService {
  // ============================================================
  // GET ALL INVENTORY ISSUES
  // ============================================================

  async getIssues(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) {
    const { page, limit, search, status } = params;
    const normalizedSearch = search?.trim();

    const where = {
      ...(status ? { status: status as "COMPLETED" } : {}),
      ...(normalizedSearch
        ? {
          OR: [
            {
              issueNumber: {
                contains: normalizedSearch,
              },
            },
            {
              order: {
                is: {
                  orderNumber: {
                    contains: normalizedSearch,
                  },
                },
              },
            },
            {
              order: {
                is: {
                  account: {
                    is: {
                      person: {
                        is: {
                          fullName: {
                            contains: normalizedSearch,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              items: {
                some: {
                  OR: [
                    {
                      productName: {
                        contains: normalizedSearch,
                      },
                    },
                    {
                      sku: {
                        contains: normalizedSearch,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.inventoryIssue.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          id: "desc",
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              status: true,
              deliveredAt: true,
              account: {
                select: {
                  id: true,
                  person: {
                    select: {
                      fullName: true,
                    },
                  },
                },
              },
            },
          },
          items: {
            orderBy: {
              id: "asc",
            },
            select: {
              id: true,
              variantId: true,
              productName: true,
              sku: true,
              quantity: true,
            },
          },
        },
      }),
      prisma.inventoryIssue.count({ where }),
    ]);

    const summary = await this.getIssueSummary();

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  async getIssueSummary() {
    const now = new Date();

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const tomorrowStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );

    const [
      total,
      today,
      totalItems,
      quantityResult,
    ] = await Promise.all([
      prisma.inventoryIssue.count(),

      prisma.inventoryIssue.count({
        where: {
          createdAt: {
            gte: todayStart,
            lt: tomorrowStart,
          },
        },
      }),

      prisma.inventoryIssueItem.count(),

      prisma.inventoryIssueItem.aggregate({
        _sum: {
          quantity: true,
        },
      }),
    ]);

    return {
      total,
      today,
      totalItems,
      totalQuantity: quantityResult._sum.quantity ?? 0,
    };
  }

  // ============================================================
  // GET INVENTORY ISSUE BY ID
  // ============================================================

  async getIssueById(id: bigint | number) {
    return prisma.inventoryIssue.findUnique({
      where: {
        id: BigInt(id),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            deliveredAt: true,
            account: {
              select: {
                id: true,
                person: {
                  select: {
                    fullName: true,
                  },
                },
              },
            },
          },
        },
        items: {
          orderBy: {
            id: "asc",
          },
          select: {
            id: true,
            variantId: true,
            productName: true,
            sku: true,
            quantity: true,
          },
        },
      },
    });
  }

  // ============================================================
  // CREATE ISSUE FOR A DELIVERED ORDER
  //
  // IMPORTANT:
  // - This method MUST receive the caller's transaction client.
  // - It does NOT open its own transaction.
  // - It only creates the historical export document.
  // - Stock deduction and Order -> DELIVERED remain the
  //   responsibility of OrderService in the same transaction.
  // ============================================================

  async createForDeliveredOrder(
    tx: PrismaTransactionClient,
    orderId: bigint | number,
  ) {
    const orderIdBigInt = BigInt(orderId);

    const order = await tx.order.findUnique({
      where: {
        id: orderIdBigInt,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        items: {
          select: {
            variantId: true,
            productName: true,
            sku: true,
            quantity: true,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!order) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new Error("ORDER_NOT_DELIVERED");
    }

    if (order.items.length === 0) {
      throw new Error("ORDER_ITEMS_REQUIRED");
    }

    const existingIssue = await tx.inventoryIssue.findUnique({
      where: {
        orderId: order.id,
      },
      select: {
        id: true,
      },
    });

    if (existingIssue) {
      throw new Error("INVENTORY_ISSUE_ALREADY_EXISTS");
    }

    const issueNumber = await this.generateIssueNumber(tx);

    return tx.inventoryIssue.create({
      data: {
        issueNumber,
        orderId: order.id,
        status: "COMPLETED",
        items: {
          create: order.items.map((item) => ({
            variantId: item.variantId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
          })),
        },
      },
      include: {
        items: {
          orderBy: {
            id: "asc",
          },
        },
      },
    });
  }

  // ============================================================
  // GENERATE ISSUE NUMBER
  //
  // Follows the same numbering style already used by Orders/
  // Receipts: ISS-YYYY-0001.
  // ============================================================

  private async generateIssueNumber(
    tx: PrismaTransactionClient,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ISS-${year}-`;

    const latestIssue = await tx.inventoryIssue.findFirst({
      where: {
        issueNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        id: "desc",
      },
      select: {
        issueNumber: true,
      },
    });

    let nextNumber = 1;

    if (latestIssue) {
      const match = latestIssue.issueNumber.match(
        /^ISS-\d{4}-(\d+)$/,
      );

      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    return `${prefix}${nextNumber
      .toString()
      .padStart(4, "0")}`;
  }
}

export const inventoryIssueService =
  new InventoryIssueService();