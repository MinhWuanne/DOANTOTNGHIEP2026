
import {
  FinancialAdjustmentDirection,
  FinancialAdjustmentReason,
  FinancialAdjustmentStatus,
} from "../../../generated/prisma/enums.js";
import {
  financialAdjustmentService,
  type CreateFinancialAdjustmentInput,
  type ListFinancialAdjustmentsParams,
} from "../../../services/admin/wallet/financial-adjustment.service.js";

export class FinancialAdjustmentController {
  async createAdjustment(
    input: CreateFinancialAdjustmentInput,
    adminId: string,
  ) {
    return financialAdjustmentService.createAdjustment(input, adminId);
  }

  async listAdjustments(
    params: ListFinancialAdjustmentsParams = {},
  ) {
    return financialAdjustmentService.listAdjustments(params);
  }

  async getAdjustment(ticketCode: string) {
    return financialAdjustmentService.getAdjustment(ticketCode);
  }

  async confirmAdjustment(
    ticketCode: string,
    adminId: string,
    password: string,
  ) {
    return financialAdjustmentService.confirmAdjustment(
      ticketCode,
      adminId,
      password,
    );
  }

  isValidDirection(
    value: unknown,
  ): value is FinancialAdjustmentDirection {
    return (
      typeof value === "string" &&
      Object.values(FinancialAdjustmentDirection).includes(
        value as FinancialAdjustmentDirection,
      )
    );
  }

  isValidReason(
    value: unknown,
  ): value is FinancialAdjustmentReason {
    return (
      typeof value === "string" &&
      Object.values(FinancialAdjustmentReason).includes(
        value as FinancialAdjustmentReason,
      )
    );
  }

  isValidStatus(
    value: unknown,
  ): value is FinancialAdjustmentStatus {
    return (
      typeof value === "string" &&
      Object.values(FinancialAdjustmentStatus).includes(
        value as FinancialAdjustmentStatus,
      )
    );
  }
}

export const financialAdjustmentController =
  new FinancialAdjustmentController();
