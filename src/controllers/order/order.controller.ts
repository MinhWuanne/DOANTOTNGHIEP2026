import { OrderStatus } from "../../generated/prisma/enums.js";
import { parsePositiveId } from "../../utils/parse-positive-id.js";

import {
  orderService,
  CreateOrderInput,
} from "../../services/order/order.service.js";

export interface CreateOrderRequest {
  accountId: string | number;

  // Address bắt buộc khi tạo Order
  addressId: string | number;

  platform: CreateOrderInput["platform"];
  paymentMethod: CreateOrderInput["paymentMethod"];
  shippingFee?: string | number;
  discount?: string | number;

  items: Array<{
    variantId: string | number;
    quantity: number;
  }>;
}

export class OrderController {
  async createOrder(
    input: CreateOrderRequest,
  ) {
    if (!Array.isArray(input.items)) {
      throw new Error("INVALID_ORDER_ITEMS");
    }
    const data: CreateOrderInput = {
      accountId:
        parsePositiveId(String(input.accountId)),

      addressId:
        parsePositiveId(String(input.addressId)),

      platform: input.platform,
      paymentMethod: input.paymentMethod,

      shippingFee:
        input.shippingFee ?? 0,

      discount:
        input.discount ?? 0,

      items: input.items.map(
        (item) => {
          if (
            item === null ||
            typeof item !== "object" ||
            Array.isArray(item)
          ) {
            throw new Error(
              "INVALID_ORDER_ITEM",
            );
          }

          return {
            variantId:
              parsePositiveId(
                String(item.variantId),
              ),

            quantity: item.quantity,
          };
        },
      ),
    };

    return orderService.createOrder(data);
  }


  async getMyOrders(
    accountId: string | number,
  ) {
    return orderService.getMyOrders(
      parsePositiveId(String(accountId)),
    );
  }


  async getOrderById(
    id: string | number,
  ) {
    return orderService.getOrderById(
      parsePositiveId(String(id)),
    );
  }

  async updateOrderStatus(
    id: string | number,
    status: OrderStatus,
  ) {
    return orderService.updateOrderStatus(
      parsePositiveId(String(id)),
      status,
    );
  }
}

export const orderController =
  new OrderController();