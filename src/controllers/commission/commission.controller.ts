import {
  CommissionSourceType,
} from "../../generated/prisma/enums.js";

import {
  commissionService,
  CreateCommissionInput,
} from "../../services/commission/commission.service.js";

import {
  commissionEligibilityService,
} from "../../services/commission/commission-eligibility.service.js";

export interface CreateCommissionRequest {
  orderId: string | number;
  sourceType: CommissionSourceType;
}

export class CommissionController {
  async createCommission(
    input: CreateCommissionRequest,
  ) {
    const data: CreateCommissionInput = {
      orderId: BigInt(input.orderId),
      sourceType: input.sourceType,
    };

    return commissionService.createCommission(data);
  }

  async getCommissionById(
    id: string | number,
  ) {
    return commissionService.getCommissionById(
      BigInt(id),
    );
  }

  async checkCommissionEligibility(
    orderId: string | number,
  ) {
    return commissionEligibilityService.isCommissionEligible(
      BigInt(orderId),
    );
  }

  async approveCommission(
    id: string | number,
  ) {
    return commissionService.approveCommission(
      BigInt(id),
    );
  }

  async payCommission(
    id: string | number,
  ) {
    return commissionService.payCommission(
      BigInt(id),
    );
  }

  async getFranchiseCommissions(
    accountId: string | number,
    period: "today" | "7days" | "week" | "month" | "year" | "custom",
    from?: string,
    to?: string,
  ) {
    return commissionService.getFranchiseCommissions({
      accountId: BigInt(accountId),
      period,
      from,
      to,
    });
  }
}

export const commissionController =
  new CommissionController();