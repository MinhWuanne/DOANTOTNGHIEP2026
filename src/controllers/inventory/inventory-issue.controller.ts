import {
  inventoryIssueService,
} from "../../services/inventory/inventory-issue.service.js";

import {
  parsePositiveId,
} from "../../utils/parse-positive-id.js";

export class InventoryIssueController {
  async getIssues(params: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
  }) {
    return inventoryIssueService.getIssues(params);
  }

  async getIssueById(
    issueId: string | number,
  ) {
    return inventoryIssueService.getIssueById(
      parsePositiveId(String(issueId)),
    );
  }
}

export const inventoryIssueController =
  new InventoryIssueController();