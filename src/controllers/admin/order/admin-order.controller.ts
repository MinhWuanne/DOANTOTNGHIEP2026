
import { OrderStatus } from "../../../generated/prisma/enums.js";
import { adminOrderService } from "../../../services/admin/order/admin-order.service.js";
import { parseAdminId } from "../../../utils/admin/parse-admin-id.js";

export class AdminOrderController {
  async getOrders() {
    return adminOrderService.getOrders();
  }

  async getOrderById(id: string) {
    return adminOrderService.getOrderById(
      parseAdminId(id),
    );
  }

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
  ) {
    return adminOrderService.updateOrderStatus(
      parseAdminId(id),
      status,
    );
  }
}

export const adminOrderController =
  new AdminOrderController();

