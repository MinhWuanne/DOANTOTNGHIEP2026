import {
  referralService,
  CreateReferralInput,
} from "../../services/referral/referral.service.js";

export interface CreateReferralRequest {
  sourceAccountId?: string | number | null;
  targetAccountId: string | number;
}

export class ReferralController {
  async createReferral(input: CreateReferralRequest) {
    const data: CreateReferralInput = {
      sourceAccountId:
        input.sourceAccountId === undefined ||
        input.sourceAccountId === null
          ? null
          : BigInt(input.sourceAccountId),

      targetAccountId: BigInt(input.targetAccountId),
    };

    return referralService.createReferral(data);
  }

  async getReferralByTargetAccountId(
    targetAccountId: string | number,
  ) {
    return referralService.getReferralByTargetAccountId(
      BigInt(targetAccountId),
    );
  }

  async getReferralById(id: string | number) {
    return referralService.getReferralById(BigInt(id));
  }
}

export const referralController =
  new ReferralController();