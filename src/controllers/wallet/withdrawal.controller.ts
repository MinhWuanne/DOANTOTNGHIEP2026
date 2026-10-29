import { withdrawalService } from "../../services/wallet/withdrawal.service.js";

export class WithdrawalController {
  async approveWithdrawal(
    id: string | number,
  ) {
    return withdrawalService.approveWithdrawal(
      BigInt(id),
    );
  }

  async rejectWithdrawal(
    id: string | number,
    note?: string,
  ) {
    return withdrawalService.rejectWithdrawal(
      BigInt(id),
      note,
    );
  }

  async completeWithdrawal(
    id: string | number,
  ) {
    return withdrawalService.completeWithdrawal(
      BigInt(id),
    );
  }
}

export const withdrawalController =
  new WithdrawalController();
