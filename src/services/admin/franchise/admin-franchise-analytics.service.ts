
import { prisma } from "../../../lib/prisma.js";
import {
    AccountPlatform,
    CommissionStatus,
    OrderStatus,
    PaymentStatus,
} from "../../../generated/prisma/enums.js";
import { demoClockService } from "../../demo-clock/demo-clock.service.js";

export interface AdminFranchiseAnalyticsInput {
    franchiseId?: bigint;
    from?: Date;
    to?: Date;
    groupBy?: "hour" | "day";
}

export interface AdminFranchiseRankingInput {
    sortBy: "revenue" | "orders" | "commission" | "network";
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
}

interface FranchiseBasic {
    id: bigint;
    personId: bigint;
    fullName: string;
    email: string | null;
    phone: string | null;
    accountStatus: string;
    franchiseStatus: string | null;
    franchiseCode: string | null;
    joinedAt: Date | null;
}

interface ReferralRow {
    sourceAccountId: bigint | null;
    targetAccountId: bigint;
}

export class AdminFranchiseAnalyticsService {
    // ============================================================
    // HELPERS
    // ============================================================

    private async getFranchises(): Promise<FranchiseBasic[]> {
        const rows = await prisma.userAccount.findMany({
            where: {
                platform: AccountPlatform.FRANCHISE,
            },
            select: {
                id: true,
                personId: true,
                email: true,
                phone: true,
                status: true,
                person: {
                    select: {
                        fullName: true,
                    },
                },
                franchiseProfile: {
                    select: {
                        franchiseCode: true,
                        status: true,
                        joinedAt: true,
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        return rows.map((row) => ({
            id: row.id,
            personId: row.personId,
            fullName: row.person.fullName,
            email: row.email,
            phone: row.phone,
            accountStatus: row.status,
            franchiseStatus:
                row.franchiseProfile?.status ?? null,
            franchiseCode:
                row.franchiseProfile?.franchiseCode ?? null,
            joinedAt:
                row.franchiseProfile?.joinedAt ?? null,
        }));
    }

    private async getReferralRows(): Promise<ReferralRow[]> {
        return prisma.referralRelationship.findMany({
            select: {
                sourceAccountId: true,
                targetAccountId: true,
            },
        });
    }

    private buildChildrenMap(
        referrals: ReferralRow[],
    ): Map<bigint, bigint[]> {
        const childrenMap = new Map<bigint, bigint[]>();

        for (const referral of referrals) {
            if (referral.sourceAccountId === null) {
                continue;
            }

            const current =
                childrenMap.get(referral.sourceAccountId) ?? [];

            current.push(referral.targetAccountId);

            childrenMap.set(
                referral.sourceAccountId,
                current,
            );
        }

        return childrenMap;
    }

    private getDescendantIds(
        rootId: bigint,
        childrenMap: Map<bigint, bigint[]>,
    ): Array<{
        id: bigint;
        parentAccountId: bigint;
        level: number;
    }> {
        const result: Array<{
            id: bigint;
            parentAccountId: bigint;
            level: number;
        }> = [];

        const queue: Array<{
            id: bigint;
            parentAccountId: bigint;
            level: number;
        }> = [];

        const directChildren =
            childrenMap.get(rootId) ?? [];

        for (const childId of directChildren) {
            queue.push({
                id: childId,
                parentAccountId: rootId,
                level: 1,
            });
        }

        const visited = new Set<string>();

        while (queue.length > 0) {
            const current = queue.shift();

            if (!current) {
                break;
            }

            const currentKey = current.id.toString();

            if (visited.has(currentKey)) {
                continue;
            }

            visited.add(currentKey);

            result.push(current);

            const children =
                childrenMap.get(current.id) ?? [];

            for (const childId of children) {
                queue.push({
                    id: childId,
                    parentAccountId: current.id,
                    level: current.level + 1,
                });
            }
        }

        return result;
    }

    private decimalToNumber(
        value: unknown,
    ): number {
        if (value === null || value === undefined) {
            return 0;
        }

        return Number(value);
    }

    private buildDateRangeWhere(
        from?: Date,
        to?: Date,
    ) {
        if (!from && !to) {
            return {};
        }

        return {
            createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lt: to } : {}),
            },
        };
    }

    private getTimelineKey(
        date: Date,
        groupBy: "hour" | "day",
    ): string {
        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1,
        ).padStart(2, "0");

        const day = String(
            date.getDate(),
        ).padStart(2, "0");

        if (groupBy === "hour") {
            const hour = String(
                date.getHours(),
            ).padStart(2, "0");

            return `${year}-${month}-${day}T${hour}:00:00`;
        }

        return `${year}-${month}-${day}`;
    }

    private getTimelineBucketStart(
        date: Date,
        groupBy: "hour" | "day",
    ): Date {
        const result = new Date(date);

        if (groupBy === "hour") {
            result.setMinutes(0, 0, 0);
            return result;
        }

        result.setHours(0, 0, 0, 0);
        return result;
    }

    private getNextTimelineBucket(
        date: Date,
        groupBy: "hour" | "day",
    ): Date {
        const result = new Date(date);

        if (groupBy === "hour") {
            result.setHours(
                result.getHours() + 1,
                0,
                0,
                0,
            );

            return result;
        }

        result.setDate(
            result.getDate() + 1,
        );
        result.setHours(0, 0, 0, 0);

        return result;
    }

    private buildTimelineBuckets(
        from: Date | undefined,
        to: Date | undefined,
        groupBy: "hour" | "day",
    ): Array<{
        date: string;
        orders: number;
        revenue: number;
        paidCommission: number;
    }> {
        if (!from || !to || from >= to) {
            return [];
        }

        const buckets: Array<{
            date: string;
            orders: number;
            revenue: number;
            paidCommission: number;
        }> = [];

        let cursor =
            this.getTimelineBucketStart(
                from,
                groupBy,
            );

        const end =
            this.getTimelineBucketStart(
                to,
                groupBy,
            );

        while (cursor < end) {
            buckets.push({
                date: this.getTimelineKey(
                    cursor,
                    groupBy,
                ),
                orders: 0,
                revenue: 0,
                paidCommission: 0,
            });

            cursor =
                this.getNextTimelineBucket(
                    cursor,
                    groupBy,
                );
        }

        return buckets;
    }

    private async getAttributedOrderTargetIds(
        franchiseId?: bigint,
    ): Promise<bigint[]> {
        if (franchiseId === undefined) {
            const referrals =
                await prisma.referralRelationship.findMany({
                    where: {
                        sourceType: "FRANCHISE",
                        sourceAccount: {
                            platform:
                                AccountPlatform.FRANCHISE,
                        },
                    },
                    select: {
                        targetAccountId: true,
                    },
                });

            return referrals.map(
                (item) => item.targetAccountId,
            );
        }

        const referrals =
            await prisma.referralRelationship.findMany({
                where: {
                    sourceAccountId: franchiseId,
                },
                select: {
                    targetAccountId: true,
                },
            });

        return referrals.map(
            (item) => item.targetAccountId,
        );
    }

    // ============================================================
    // OVERVIEW
    // ============================================================

    async getOverview() {
        const now =
            await demoClockService.getNow();

        const startOfMonth = new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
            0,
            0,
            0,
            0,
        );

        const startOfNextMonth = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1,
            0,
            0,
            0,
            0,
        );

        const franchises =
            await this.getFranchises();

        const totalFranchises =
            franchises.length;

        const activeFranchises =
            franchises.filter(
                (franchise) =>
                    franchise.franchiseStatus ===
                    "ACTIVE" &&
                    franchise.accountStatus ===
                    "ACTIVE",
            ).length;

        const franchiseIds =
            franchises.map(
                (franchise) => franchise.id,
            );

        const franchiseReferrals =
            franchiseIds.length > 0
                ? await prisma.referralRelationship.findMany({
                    where: {
                        sourceAccountId: {
                            in: franchiseIds,
                        },
                    },
                    select: {
                        sourceAccountId: true,
                        targetAccountId: true,
                    },
                })
                : [];

        const franchiseTargetIds =
            franchiseReferrals.map(
                (referral) =>
                    referral.targetAccountId,
            );

        const monthlyOrders =
            franchiseTargetIds.length > 0
                ? await prisma.order.findMany({
                    where: {
                        accountId: {
                            in: franchiseTargetIds,
                        },
                        status: {
                            notIn: [
                                OrderStatus.CANCELLED,
                                OrderStatus.RETURNED,
                            ],
                        },
                        createdAt: {
                            gte: startOfMonth,
                            lt: startOfNextMonth,
                        },
                    },
                    select: {
                        id: true,
                        status: true,
                        paymentStatus: true,
                        totalAmount: true,
                        commissionEligibleAt: true,
                    },
                })
                : [];

        const eligibleOrders =
            monthlyOrders.filter(
                (order) =>
                    order.status ===
                    OrderStatus.DELIVERED &&
                    order.paymentStatus ===
                    PaymentStatus.PAID &&
                    order.commissionEligibleAt !==
                    null &&
                    order.commissionEligibleAt <= now,
            );

        const monthlyRevenue =
            eligibleOrders.reduce(
                (sum, order) =>
                    sum +
                    this.decimalToNumber(
                        order.totalAmount,
                    ),
                0,
            );

        const monthlyCommissionRows =
            franchiseIds.length > 0
                ? await prisma.commissionTransaction.findMany({
                    where: {
                        accountId: {
                            in: franchiseIds,
                        },
                        platform:
                            AccountPlatform.FRANCHISE,
                        status:
                            CommissionStatus.PAID,
                        createdAt: {
                            gte: startOfMonth,
                            lt: startOfNextMonth,
                        },
                    },
                    select: {
                        amount: true,
                    },
                })
                : [];

        const monthlyPaidCommission =
            monthlyCommissionRows.reduce(
                (sum, commission) =>
                    sum +
                    this.decimalToNumber(
                        commission.amount,
                    ),
                0,
            );

        return {
            totalFranchises,
            activeFranchises,
            monthlyOrders:
                monthlyOrders.length,
            monthlyRevenue,
            monthlyPaidCommission,
        };
    }

    // ============================================================
    // NETWORK
    // ============================================================

    async getNetwork(
        franchiseId: bigint,
    ) {
        const franchise =
            await prisma.userAccount.findFirst({
                where: {
                    id: franchiseId,
                    platform:
                        AccountPlatform.FRANCHISE,
                },
                select: {
                    id: true,
                    personId: true,
                    email: true,
                    phone: true,
                    platform: true,
                    status: true,
                    person: {
                        select: {
                            fullName: true,
                        },
                    },
                    franchiseProfile: {
                        select: {
                            franchiseCode: true,
                            status: true,
                            joinedAt: true,
                        },
                    },
                },
            });

        if (!franchise) {
            throw new Error(
                "FRANCHISE_NOT_FOUND",
            );
        }

        const referrals =
            await this.getReferralRows();

        const childrenMap =
            this.buildChildrenMap(
                referrals,
            );

        const descendants =
            this.getDescendantIds(
                franchiseId,
                childrenMap,
            );

        const descendantIds =
            descendants.map(
                (item) => item.id,
            );

        const descendantAccounts =
            descendantIds.length > 0
                ? await prisma.userAccount.findMany({
                    where: {
                        id: {
                            in: descendantIds,
                        },
                    },
                    select: {
                        id: true,
                        personId: true,
                        email: true,
                        phone: true,
                        platform: true,
                        status: true,
                        person: {
                            select: {
                                fullName: true,
                            },
                        },
                        franchiseProfile: {
                            select: {
                                franchiseCode: true,
                                status: true,
                                joinedAt: true,
                            },
                        },
                    },
                })
                : [];

        const accountMap =
            new Map(
                descendantAccounts.map(
                    (account) => [
                        account.id.toString(),
                        account,
                    ],
                ),
            );

        const nodes = descendants
            .map((descendant) => {
                const account =
                    accountMap.get(
                        descendant.id.toString(),
                    );

                if (!account) {
                    return null;
                }

                return {
                    id: account.id,
                    parentAccountId:
                        descendant.parentAccountId,
                    personId:
                        account.personId,
                    fullName:
                        account.person.fullName,
                    email:
                        account.email,
                    phone:
                        account.phone,
                    platform:
                        account.platform,
                    accountStatus:
                        account.status,
                    franchiseStatus:
                        account.franchiseProfile
                            ?.status ?? null,
                    franchiseCode:
                        account.franchiseProfile
                            ?.franchiseCode ?? null,
                    level:
                        descendant.level,
                };
            })
            .filter(
                (
                    node,
                ): node is NonNullable<
                    typeof node
                > => node !== null,
            );

        const directDownline =
            childrenMap.get(franchiseId)
                ?.length ?? 0;

        return {
            root: {
                id: franchise.id,
                personId:
                    franchise.personId,
                fullName:
                    franchise.person.fullName,
                email:
                    franchise.email,
                phone:
                    franchise.phone,
                platform:
                    franchise.platform,
                accountStatus:
                    franchise.status,
                franchiseStatus:
                    franchise.franchiseProfile
                        ?.status ?? null,
                franchiseCode:
                    franchise.franchiseProfile
                        ?.franchiseCode ?? null,
                joinedAt:
                    franchise.franchiseProfile
                        ?.joinedAt ?? null,
            },

            stats: {
                directDownline,

                otherDownline:
                    Math.max(
                        nodes.length -
                        directDownline,
                        0,
                    ),

                totalDownline:
                    nodes.length,
            },

            nodes,
        };
    }

    // ============================================================
    // ANALYTICS
    // ============================================================

    async getAnalytics(
        input: AdminFranchiseAnalyticsInput,
    ) {
        const now =
            await demoClockService.getNow();

        const groupBy =
            input.groupBy ?? "day";

        const targetAccountIds =
            await this.getAttributedOrderTargetIds(
                input.franchiseId,
            );

        const orderWhere = {
            accountId: {
                in: targetAccountIds,
            },
            status: {
                notIn: [
                    OrderStatus.CANCELLED,
                    OrderStatus.RETURNED,
                ],
            },
            ...this.buildDateRangeWhere(
                input.from,
                input.to,
            ),
        };

        const orders =
            targetAccountIds.length > 0
                ? await prisma.order.findMany({
                    where: orderWhere,
                    select: {
                        id: true,
                        accountId: true,
                        status: true,
                        paymentStatus: true,
                        totalAmount: true,
                        commissionEligibleAt: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                })
                : [];

        /*
         * Commission phải được lọc theo createdAt của chính commission,
         * vì đây là thời điểm Paid Commission được ghi nhận.
         *
         * Không dùng order.createdAt để giới hạn commission.
         */
        const attributedOrderIds =
            targetAccountIds.length > 0
                ? await prisma.order.findMany({
                    where: {
                        accountId: {
                            in: targetAccountIds,
                        },
                        status: {
                            notIn: [
                                OrderStatus.CANCELLED,
                                OrderStatus.RETURNED,
                            ],
                        },
                    },
                    select: {
                        id: true,
                    },
                })
                : [];

        const attributedOrderIdList =
            attributedOrderIds.map(
                (order) => order.id,
            );

        const commissions =
            attributedOrderIdList.length > 0
                ? await prisma.commissionTransaction.findMany({
                    where: {
                        orderId: {
                            in: attributedOrderIdList,
                        },
                        platform:
                            AccountPlatform.FRANCHISE,
                        ...(input.franchiseId !== undefined
                            ? {
                                accountId:
                                    input.franchiseId,
                            }
                            : {}),
                        status:
                            CommissionStatus.PAID,
                        ...this.buildDateRangeWhere(
                            input.from,
                            input.to,
                        ),
                    },
                    select: {
                        orderId: true,
                        amount: true,
                        createdAt: true,
                    },
                    orderBy: {
                        createdAt: "asc",
                    },
                })
                : [];

        const timeline =
            this.buildTimelineBuckets(
                input.from,
                input.to,
                groupBy,
            );

        const timelineMap =
            new Map<
                string,
                {
                    date: string;
                    orders: number;
                    revenue: number;
                    paidCommission: number;
                }
            >();

        for (const item of timeline) {
            timelineMap.set(
                item.date,
                item,
            );
        }

        let summaryOrders = 0;
        let summaryRevenue = 0;
        let summaryPaidCommission = 0;

        /*
         * Orders:
         * - Không CANCELLED
         * - Không RETURNED
         * - Đếm theo thời điểm createdAt
         */
        for (const order of orders) {
            const key =
                this.getTimelineKey(
                    order.createdAt,
                    groupBy,
                );

            let item =
                timelineMap.get(key);

            if (!item) {
                item = {
                    date: key,
                    orders: 0,
                    revenue: 0,
                    paidCommission: 0,
                };

                timelineMap.set(
                    key,
                    item,
                );
            }

            item.orders += 1;
            summaryOrders += 1;

            /*
             * Revenue:
             * - DELIVERED
             * - PAID
             * - commissionEligibleAt đã tới
             *
             * RETURNED đã bị loại từ order query.
             */
            if (
                order.status ===
                OrderStatus.DELIVERED &&
                order.paymentStatus ===
                PaymentStatus.PAID &&
                order.commissionEligibleAt !==
                null &&
                order.commissionEligibleAt <= now
            ) {
                const revenue =
                    this.decimalToNumber(
                        order.totalAmount,
                    );

                item.revenue += revenue;
                summaryRevenue += revenue;
            }
        }

        /*
         * Paid Commission:
         * ghi vào bucket theo commission.createdAt,
         * không theo order.createdAt.
         */
        for (const commission of commissions) {
            const key =
                this.getTimelineKey(
                    commission.createdAt,
                    groupBy,
                );

            let item =
                timelineMap.get(key);

            if (!item) {
                item = {
                    date: key,
                    orders: 0,
                    revenue: 0,
                    paidCommission: 0,
                };

                timelineMap.set(
                    key,
                    item,
                );
            }

            const paidCommission =
                this.decimalToNumber(
                    commission.amount,
                );

            item.paidCommission +=
                paidCommission;

            summaryPaidCommission +=
                paidCommission;
        }

        const sortedTimeline =
            Array.from(
                timelineMap.values(),
            ).sort((a, b) =>
                a.date.localeCompare(
                    b.date,
                ),
            );

        return {
            filter: {
                ...(input.franchiseId !== undefined
                    ? {
                        franchiseId:
                            input.franchiseId,
                    }
                    : {}),
                ...(input.from
                    ? {
                        from: input.from,
                    }
                    : {}),
                ...(input.to
                    ? {
                        to: input.to,
                    }
                    : {}),
                groupBy,
            },

            summary: {
                orders: summaryOrders,
                revenue: summaryRevenue,
                paidCommission:
                    summaryPaidCommission,
            },

            timeline:
                sortedTimeline,
        };
    }

    // ============================================================
    // RANKING
    // ============================================================

    async getRanking(
        input: AdminFranchiseRankingInput,
    ) {
        const limit =
            input.limit ?? 10;

        const offset =
            input.offset ?? 0;

        const franchises =
            await this.getFranchises();

        const franchiseIds =
            franchises.map(
                (franchise) => franchise.id,
            );

        if (franchiseIds.length === 0) {
            return {
                sortBy: input.sortBy,

                ...(input.from
                    ? { from: input.from }
                    : {}),

                ...(input.to
                    ? { to: input.to }
                    : {}),

                items: [],
                total: 0,
                hasMore: false,
            };
        }

        const referrals =
            await prisma.referralRelationship.findMany({
                where: {
                    sourceAccountId: {
                        in: franchiseIds,
                    },
                },
                select: {
                    sourceAccountId: true,
                    targetAccountId: true,
                },
            });

        const targetIds =
            referrals.map(
                (referral) =>
                    referral.targetAccountId,
            );

        const orders =
            targetIds.length > 0
                ? await prisma.order.findMany({
                    where: {
                        accountId: {
                            in: targetIds,
                        },
                        status: {
                            notIn: [
                                OrderStatus.CANCELLED,
                                OrderStatus.RETURNED,
                            ],
                        },
                        ...this.buildDateRangeWhere(
                            input.from,
                            input.to,
                        ),
                    },
                    select: {
                        id: true,
                        accountId: true,
                        status: true,
                        paymentStatus: true,
                        totalAmount: true,
                        commissionEligibleAt: true,
                    },
                })
                : [];

        const referralOwnerByTarget =
            new Map<string, bigint>();

        for (const referral of referrals) {
            if (
                referral.sourceAccountId ===
                null
            ) {
                continue;
            }

            referralOwnerByTarget.set(
                referral.targetAccountId.toString(),
                referral.sourceAccountId,
            );
        }

        const orderIds =
            orders.map(
                (order) => order.id,
            );

        const commissions =
            orderIds.length > 0
                ? await prisma.commissionTransaction.findMany({
                    where: {
                        orderId: {
                            in: orderIds,
                        },
                        accountId: {
                            in: franchiseIds,
                        },
                        platform:
                            AccountPlatform.FRANCHISE,
                        status:
                            CommissionStatus.PAID,
                    },
                    select: {
                        accountId: true,
                        amount: true,
                    },
                })
                : [];

        const metrics =
            new Map<
                string,
                {
                    orders: number;
                    revenue: number;
                    paidCommission: number;
                }
            >();

        for (const franchiseId of franchiseIds) {
            metrics.set(
                franchiseId.toString(),
                {
                    orders: 0,
                    revenue: 0,
                    paidCommission: 0,
                },
            );
        }

        const now =
            await demoClockService.getNow();

        for (const order of orders) {
            const franchiseId =
                referralOwnerByTarget.get(
                    order.accountId.toString(),
                );

            if (!franchiseId) {
                continue;
            }

            const metric =
                metrics.get(
                    franchiseId.toString(),
                );

            if (!metric) {
                continue;
            }

            /*
             * Franchise Orders:
             * mọi order không CANCELLED / RETURNED.
             */
            metric.orders += 1;

            /*
             * Franchise Revenue:
             * DELIVERED + PAID + commission eligible.
             */
            if (
                order.status ===
                OrderStatus.DELIVERED &&
                order.paymentStatus ===
                PaymentStatus.PAID &&
                order.commissionEligibleAt !==
                null &&
                order.commissionEligibleAt <= now
            ) {
                metric.revenue +=
                    this.decimalToNumber(
                        order.totalAmount,
                    );
            }
        }

        /*
         * Ranking Commission = Paid Commission only.
         */
        for (const commission of commissions) {
            const metric =
                metrics.get(
                    commission.accountId.toString(),
                );

            if (!metric) {
                continue;
            }

            metric.paidCommission +=
                this.decimalToNumber(
                    commission.amount,
                );
        }

        const childrenMap =
            this.buildChildrenMap(
                referrals,
            );

        const referralCount =
            new Map<string, number>();

        for (const franchise of franchises) {
            const descendants =
                this.getDescendantIds(
                    franchise.id,
                    childrenMap,
                );

            referralCount.set(
                franchise.id.toString(),
                descendants.length,
            );
        }

        const items = franchises.map(
            (franchise) => {
                const metric =
                    metrics.get(
                        franchise.id.toString(),
                    ) ?? {
                        orders: 0,
                        revenue: 0,
                        paidCommission: 0,
                    };

                return {
                    franchiseId:
                        franchise.id,
                    franchiseCode:
                        franchise.franchiseCode,
                    fullName:
                        franchise.fullName,
                    orders:
                        metric.orders,
                    revenue:
                        metric.revenue,
                    paidCommission:
                        metric.paidCommission,
                    totalDownline:
                        referralCount.get(
                            franchise.id.toString(),
                        ) ?? 0,
                };
            },
        );

        items.sort((a, b) => {
            let result = 0;

            if (input.sortBy === "orders") {
                result =
                    b.orders -
                    a.orders;
            } else if (
                input.sortBy ===
                "commission"
            ) {
                result =
                    b.paidCommission -
                    a.paidCommission;
            } else if (
                input.sortBy ===
                "network"
            ) {
                result =
                    b.totalDownline -
                    a.totalDownline;
            } else {
                result =
                    b.revenue -
                    a.revenue;
            }

            /*
             * Tie-breaker giúp thứ hạng ổn định,
             * tránh cùng số liệu nhưng thứ tự thay đổi
             * giữa các lần gọi API.
             */
            if (result !== 0) {
                return result;
            }

            return (
                a.fullName.localeCompare(
                    b.fullName,
                )
            );
        });

        const rankedItems =
            items.map(
                (item, index) => ({
                    rank: index + 1,
                    ...item,
                }),
            );

        const total =
            rankedItems.length;

        const paginatedItems =
            rankedItems.slice(
                offset,
                offset + limit,
            );

        const hasMore =
            offset + limit < total;

        return {
            sortBy: input.sortBy,

            ...(input.from
                ? { from: input.from }
                : {}),

            ...(input.to
                ? { to: input.to }
                : {}),

            items: paginatedItems,

            total,

            hasMore,
        };
    }
}

export const adminFranchiseAnalyticsService =
    new AdminFranchiseAnalyticsService();

