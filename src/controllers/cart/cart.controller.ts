import {
  cartService,
  AddCartItemInput,
  UpdateCartItemInput,
} from "../../services/cart/cart.service.js";

export class CartController {
  async getCart(
    accountId: string | number,
  ) {
    return cartService.getCart(
      BigInt(accountId),
    );
  }

  async addItem(
    accountId: string | number,
    input: {
      variantId: string | number;
      quantity: number;
    },
  ) {
    const data: AddCartItemInput = {
      accountId: BigInt(accountId),
      variantId: BigInt(input.variantId),
      quantity: input.quantity,
    };

    return cartService.addItem(data);
  }

  async updateItem(
    accountId: string | number,
    input: {
      variantId: string | number;
      quantity: number;
    },
  ) {
    const data: UpdateCartItemInput = {
      accountId: BigInt(accountId),
      variantId: BigInt(input.variantId),
      quantity: input.quantity,
    };

    return cartService.updateItem(data);
  }

  async removeItem(
    accountId: string | number,
    variantId: string | number,
  ) {
    return cartService.removeItem(
      BigInt(accountId),
      BigInt(variantId),
    );
  }

  async clearCart(
    accountId: string | number,
  ) {
    return cartService.clearCart(
      BigInt(accountId),
    );
  }
}

export const cartController =
  new CartController();