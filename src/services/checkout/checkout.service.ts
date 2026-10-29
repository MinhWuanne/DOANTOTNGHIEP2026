import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import {
  AccountPlatform,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  UserStatus,
  WalletTransactionType,
} from "../../generated/prisma/enums.js";
import { inventoryService } from "../inventory/inventory.service.js";

const MAX_CHECKOUT_ITEM_QUANTITY = 99;
const DEFAULT_SHIPPING_FEE = new Prisma.Decimal(30000);
const DEFAULT_DISCOUNT_RATE = new Prisma.Decimal("0.10");

export interface CheckoutInput {
  accountId: bigint | number;
  platform: AccountPlatform;
  addressId?: bigint | number | null;

  /*
   * Kept for backward compatibility with existing callers/tests.
   * These values MUST NOT be trusted.
   * Checkout always uses server-side defaults.
   */
  shippingFee?: Prisma.Decimal | number | string;
  discount?: Prisma.Decimal | number | string;

  paymentMethod?: PaymentMethod;
}

export class CheckoutService {
  async checkout(input: CheckoutInput) {
    const accountId = BigInt(input.accountId);

    const account = await prisma.userAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        personId: true,
        platform: true,
        status: true,
      },
    });

    if (!account) {
      throw new Error("ACCOUNT_NOT_FOUND");
    }

    if (account.platform !== input.platform) {
      throw new Error("ACCOUNT_PLATFORM_MISMATCH");
    }

    if (account.platform !== AccountPlatform.MEMBER) {
      throw new Error("MEMBER_ACCOUNT_REQUIRED");
    }

    if (account.status !== UserStatus.ACTIVE) {
      throw new Error("ACCOUNT_NOT_ACTIVE");
    }

    let addressId: bigint | null = null;

    if (
      input.addressId !== undefined &&
      input.addressId !== null
    ) {
      addressId = BigInt(input.addressId);

      const address = await prisma.address.findUnique({
        where: { id: addressId },
        select: {
          id: true,
          personId: true,
        },
      });

      if (!address) {
        throw new Error("ADDRESS_NOT_FOUND");
      }

      if (address.personId !== account.personId) {
        throw new Error(
          "ADDRESS_NOT_BELONG_TO_ACCOUNT_PERSON",
        );
      }
    }

    const paymentMethod =
      input.paymentMethod ?? PaymentMethod.COD;

    return prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { accountId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
            orderBy: { id: "asc" },
          },
        },
      });

      if (!cart) {
        throw new Error("CART_NOT_FOUND");
      }

      if (cart.items.length === 0) {
        throw new Error("CART_EMPTY");
      }

      const orderItemsData = cart.items.map((cartItem) => {
        const variant = cartItem.variant;

        if (!variant.product) {
          throw new Error("PRODUCT_NOT_FOUND");
        }

        if (
          variant.product.status !== ProductStatus.ACTIVE
        ) {
          throw new Error("PRODUCT_NOT_ACTIVE");
        }

        if (variant.status !== ProductStatus.ACTIVE) {
          throw new Error(
            "PRODUCT_VARIANT_NOT_ACTIVE",
          );
        }

        if (
          !Number.isInteger(cartItem.quantity) ||
          cartItem.quantity <= 0 ||
          cartItem.quantity > MAX_CHECKOUT_ITEM_QUANTITY
        ) {
          throw new Error("INVALID_ITEM_QUANTITY");
        }

        const unitPrice = new Prisma.Decimal(
          variant.price,
        );

        const subtotal = unitPrice.mul(
          cartItem.quantity,
        );

        return {
          cartItemId: cartItem.id,
          variantId: variant.id,
          productName: variant.product.name,
          sku: variant.sku,
          quantity: cartItem.quantity,
          unitPrice,
          subtotal,
        };
      });

      const subtotal = orderItemsData.reduce(
        (sum, item) => sum.add(item.subtotal),
        new Prisma.Decimal(0),
      );

      /*
       * SERVER-SIDE PRICING
       *
       * Client-supplied shippingFee and discount
       * are intentionally ignored.
       */
      const shippingFee = DEFAULT_SHIPPING_FEE;

      const discount = subtotal
        .mul(DEFAULT_DISCOUNT_RATE)
        .toDecimalPlaces(2);

      const totalAmount = subtotal
        .add(shippingFee)
        .sub(discount);

      /*
       * WALLET PAYMENT
       *
       * Wallet deduction + WalletTransaction
       * + Inventory reservation + Order creation
       * + Cart clearing
       *
       * are all part of the same transaction.
       */
      let walletId: bigint | null = null;
      let walletBalanceBefore: Prisma.Decimal | null = null;

      if (paymentMethod === PaymentMethod.WALLET) {
        const wallet = await tx.wallet.findUnique({
          where: {
            accountId,
          },
        });

        if (!wallet) {
          throw new Error("WALLET_NOT_FOUND");
        }

        walletId = wallet.id;

        walletBalanceBefore = new Prisma.Decimal(
          wallet.balance,
        );

        if (
          walletBalanceBefore.lessThan(totalAmount)
        ) {
          throw new Error(
            "INSUFFICIENT_WALLET_BALANCE",
          );
        }

        const walletBalanceAfter =
          walletBalanceBefore.sub(totalAmount);

        const updatedWallet =
          await tx.wallet.updateMany({
            where: {
              id: wallet.id,
              balance: wallet.balance,
            },
            data: {
              balance: walletBalanceAfter,
            },
          });

        if (updatedWallet.count !== 1) {
          throw new Error(
            "WALLET_BALANCE_UPDATE_FAILED",
          );
        }
      }

      const orderNumber =
        await this.generateOrderNumber(tx);

      /*
       * Reserve inventory only after all basic
       * validations and Wallet balance validation
       * have passed.
       */
      for (const item of orderItemsData) {
        await inventoryService.reserveStockInTransaction(
          tx,
          item.variantId,
          item.quantity,
        );
      }

      const paymentStatus =
        paymentMethod === PaymentMethod.WALLET
          ? PaymentStatus.PAID
          : PaymentStatus.UNPAID;

      const order = await tx.order.create({
        data: {
          accountId: account.id,
          addressId,
          orderNumber,
          platform: account.platform,
          status: OrderStatus.PENDING,
          paymentStatus,
          paymentMethod,
          subtotal,
          shippingFee,
          discount,
          totalAmount,
          items: {
            create: orderItemsData.map((item) => ({
              variantId: item.variantId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          account: true,
          address: true,
          items: {
            include: {
              variant: true,
            },
          },
        },
      });

      /*
       * Create WalletTransaction only after Order
       * creation succeeds.
       */
      if (
        paymentMethod === PaymentMethod.WALLET &&
        walletId !== null &&
        walletBalanceBefore !== null
      ) {
        const walletBalanceAfter =
          walletBalanceBefore.sub(totalAmount);

        await tx.walletTransaction.create({
          data: {
            walletId,
            type: WalletTransactionType.ORDER_PAYMENT,
            amount: totalAmount,
            balanceBefore: walletBalanceBefore,
            balanceAfter: walletBalanceAfter,
            description:
              `Payment for Order #${order.id.toString()}`,
          },
        });
      }

      /*
       * Checkout succeeds only after Order and all
       * related operations have succeeded.
       */
      await tx.cartItem.deleteMany({
        where: {
          cartId: cart.id,
        },
      });

      return order;
    });
  }

  private async generateOrderNumber(
    tx: Prisma.TransactionClient,
  ) {
    const now = new Date();
    const year = now.getFullYear();
    const prefix = `ORD-${year}-`;

    const latestOrder = await tx.order.findFirst({
      where: {
        orderNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        id: "desc",
      },
      select: {
        orderNumber: true,
      },
    });

    let nextNumber = 1;

    if (latestOrder) {
      const match = latestOrder.orderNumber.match(
        /^ORD-\d{4}-(\d+)$/,
      );

      if (match) {
        nextNumber = Number(match[1]) + 1;
      }
    }

    return `${prefix}${nextNumber
      .toString()
      .padStart(4, "0")}`;
  }
}

export const checkoutService = new CheckoutService();