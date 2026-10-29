import { parsePositiveId } from "../../utils/parse-positive-id.js";
import { returnService } from "../../services/return/return.service.js";

export class ReturnController {
  async createReturnRequest(
    orderId: string | number,
    accountId: string | number,
    note?: string,
  ) {
    return returnService.createReturnRequest(
      parsePositiveId(String(orderId)),
      parsePositiveId(String(accountId)),
      note,
    );
  }

  async getMyReturnRequests(
    accountId: string | number,
  ) {
    return returnService.getMyReturnRequests(
      parsePositiveId(String(accountId)),
    );
  }

  async getMyReturnRequestById(
    id: string | number,
    accountId: string | number,
  ) {
    return returnService.getMyReturnRequestById(
      parsePositiveId(String(id)),
      parsePositiveId(String(accountId)),
    );
  }
}

export const returnController = new ReturnController();