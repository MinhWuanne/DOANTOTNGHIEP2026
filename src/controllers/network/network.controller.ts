import {
  networkService,
} from "../../services/network/network.service.js";

export class NetworkController {
  async getDirectDownline(
    accountId: string | number,
  ) {
    return networkService.getDirectDownline(
      BigInt(accountId),
    );
  }

  async getAllDownline(
    accountId: string | number,
  ) {
    return networkService.getAllDownline(
      BigInt(accountId),
    );
  }

  async getDownlineStats(
    accountId: string | number,
  ) {
    return networkService.getDownlineStats(
      BigInt(accountId),
    );
  }
}

export const networkController =
  new NetworkController();