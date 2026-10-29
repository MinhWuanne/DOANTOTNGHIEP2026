
import { adminFranchiseAnalyticsService } from "../../../services/admin/franchise/admin-franchise-analytics.service.js";

import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";

export class AdminFranchiseAnalyticsController {
    async getOverview() {
        return adminFranchiseAnalyticsService.getOverview();
    }

    async getNetwork(id: string) {
        return adminFranchiseAnalyticsService.getNetwork(
            parseAdminId(id),
        );
    }

    async getAnalytics(input: {
        franchiseId?: string;
        from?: Date;
        to?: Date;
        groupBy?: "hour" | "day";
    }) {
        return adminFranchiseAnalyticsService.getAnalytics({
            franchiseId:
                input.franchiseId !== undefined
                    ? parseAdminId(input.franchiseId)
                    : undefined,
            from: input.from,
            to: input.to,
            groupBy: input.groupBy,
        });
    }

    async getRanking(input: {
        sortBy:
            | "revenue"
            | "orders"
            | "commission"
            | "network";
        from?: Date;
        to?: Date;
        limit?: number;
        offset?: number;
    }) {
        return adminFranchiseAnalyticsService.getRanking({
            sortBy: input.sortBy,
            from: input.from,
            to: input.to,
            limit: input.limit,
            offset: input.offset,
        });
    }
}

export const adminFranchiseAnalyticsController =
    new AdminFranchiseAnalyticsController();

