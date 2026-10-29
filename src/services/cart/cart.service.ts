import { prisma } from "../../lib/prisma.js";
import {
  AccountPlatform,
  ProductStatus,
  UserStatus,
} from "../../generated/prisma/enums.js";

const MAX_CART_ITEM_QUANTITY = 99;

export interface AddCartItemInput {
  accountId: bigint | number;
  variantId: bigint | number;
  quantity: number;
}

export interface UpdateCartItemInput {
  accountId: bigint | number;
  variantId: bigint | number;
  quantity: number;
}

export class CartService {
  private async getActiveMemberAccount(accountId: bigint) {
    const account = await prisma.userAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        platform: true,
        status: true,
      },
    });

    if (!account) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    if (account.platform !== AccountPlatform.MEMBER) {
      throw new Error("MEMBER_ACCOUNT_REQUIRED");
    }

    if (account.status !== UserStatus.ACTIVE) {
      throw new Error("ACCOUNT_NOT_ACTIVE");
    }

    return account;
  }

  private validateQuantity(quantity: number) {
    if (
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > MAX_CART_ITEM_QUANTITY
    ) {
      throw new Error("INVALID_CART_ITEM_QUANTITY");
    }
  }

  private async getActiveVariant(variantId: bigint) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        id: true,
        status: true,
        product: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!variant) {
      throw new Error("PRODUCT_VARIANT_NOT_FOUND");
    }

    if (variant.product.status !== ProductStatus.ACTIVE) {
      throw new Error("PRODUCT_NOT_ACTIVE");
    }

    if (variant.status !== ProductStatus.ACTIVE) {
      throw new Error("PRODUCT_VARIANT_NOT_ACTIVE");
    }

    return variant;
  }

  async getCart(accountId: bigint | number) {
    const id = BigInt(accountId);

    await this.getActiveMemberAccount(id);

    const cart = await prisma.cart.findUnique({
      where: { accountId: id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      orderBy: {
                        sortOrder: "asc",
                      },
                    },
                  },
                },
                inventory: true,
              },
            },
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });

    if (!cart) {
      return prisma.cart.create({
        data: {
          accountId: id,
        },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: {
                        orderBy: {
                          sortOrder: "asc",
                        },
                      },
                    },
                  },
                  inventory: true,
                },
              },
            },
            orderBy: {
              id: "asc",
            },
          },
        },
      });
    }

    return cart;
  }

  async addItem(input: AddCartItemInput) {
    const accountId = BigInt(input.accountId);
    const variantId = BigInt(input.variantId);

    this.validateQuantity(input.quantity);

    await this.getActiveMemberAccount(accountId);
    await this.getActiveVariant(variantId);

    const cart = await prisma.cart.upsert({
      where: {
        accountId,
      },
      create: {
        accountId,
      },
      update: {},
    });

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    if (existingItem) {
      const newQuantity =
        existingItem.quantity + input.quantity;

      if (newQuantity > MAX_CART_ITEM_QUANTITY) {
        throw new Error("INVALID_CART_ITEM_QUANTITY");
      }

      return prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
        },
        include: {
          variant: {
            include: {
              product: true,
              inventory: true,
            },
          },
        },
      });
    }

    return prisma.cartItem.create({
      data: {
        cartId: cart.id,
        variantId,
        quantity: input.quantity,
      },
      include: {
        variant: {
          include: {
            product: true,
            inventory: true,
          },
        },
      },
    });
  }

  async updateItem(input: UpdateCartItemInput) {
    const accountId = BigInt(input.accountId);
    const variantId = BigInt(input.variantId);

    this.validateQuantity(input.quantity);

    await this.getActiveMemberAccount(accountId);

    const cart = await prisma.cart.findUnique({
      where: { accountId },
      select: { id: true },
    });

    if (!cart) {
      throw new Error("CART_NOT_FOUND");
    }

    const item = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId,
        },
      },
    });

    if (!item) {
      throw new Error("CART_ITEM_NOT_FOUND");
    }

    await this.getActiveVariant(variantId);

    return prisma.cartItem.update({
      where: { id: item.id },
      data: {
        quantity: input.quantity,
      },
      include: {
        variant: {
          include: {
            product: true,
            inventory: true,
          },
        },
      },
    });
  }

  async removeItem(
    accountId: bigint | number,
    variantId: bigint | number,
  ) {
    const accountIdBigInt = BigInt(accountId);
    const variantIdBigInt = BigInt(variantId);

    await this.getActiveMemberAccount(accountIdBigInt);

    const cart = await prisma.cart.findUnique({
      where: { accountId: accountIdBigInt },
      select: { id: true },
    });

    if (!cart) {
      throw new Error("CART_NOT_FOUND");
    }

    const item = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId: variantIdBigInt,
        },
      },
    });

    if (!item) {
      throw new Error("CART_ITEM_NOT_FOUND");
    }

    await prisma.cartItem.delete({
      where: { id: item.id },
    });

    return {
      success: true,
      cartItemId: item.id,
    };
  }

  async clearCart(accountId: bigint | number) {
    const id = BigInt(accountId);

    await this.getActiveMemberAccount(id);

    const cart = await prisma.cart.findUnique({
      where: { accountId: id },
      select: { id: true },
    });

    if (!cart) {
      throw new Error("CART_NOT_FOUND");
    }

    const result = await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    return {
      success: true,
      deletedItems: result.count,
    };
  }
}

export const cartService = new CartService();