
import { FastifyInstance } from "fastify";
import { checkoutController } from "../../controllers/checkout/checkout.controller.js";
import { authMiddleware } from "../../middlewares/auth/auth.middleware.js";
import { accountOwnershipMiddleware } from "../../middlewares/auth/account-ownership.middleware.js";

export async function checkoutRoutes(app: FastifyInstance) {
  // POST /checkout/:accountId
  app.post(
    "/checkout/:accountId",
    {
      preHandler: [
        authMiddleware,
        accountOwnershipMiddleware,
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as {
          accountId: string;
        };

        // =====================================================
        // ACCOUNT ID VALIDATION
        // =====================================================

        const accountId = parsePositiveBigInt(
          params.accountId,
          "INVALID_ACCOUNT_ID",
        );

        // =====================================================
        // REQUEST BODY
        // =====================================================

        const body = request.body as {
          platform?: unknown;
          addressId?: unknown;
          shippingFee?: unknown;
          discount?: unknown;
          paymentMethod?: unknown;
        };

        // =====================================================
        // PAYMENT METHOD VALIDATION
        // =====================================================

        const paymentMethod =
          parsePaymentMethod(body.paymentMethod);

        // =====================================================
        // ADDRESS ID VALIDATION
        // =====================================================

        let addressId: bigint | null | undefined;

        if (
          body.addressId !== undefined &&
          body.addressId !== null
        ) {
          addressId = parsePositiveBigInt(
            body.addressId,
            "INVALID_ADDRESS_ID",
          );
        } else {
          addressId = body.addressId as
            | null
            | undefined;
        }

        // =====================================================
        // CHECKOUT
        // =====================================================

        const checkout =
          await checkoutController.checkout(
            accountId,
            {
              platform:
                body.platform as
                  | "MEMBER"
                  | "FRANCHISE",
              addressId,
              shippingFee:
                body.shippingFee as
                  | string
                  | number
                  | undefined,
              discount:
                body.discount as
                  | string
                  | number
                  | undefined,
              paymentMethod,
            },
          );

        return reply.code(201).send({
          success: true,
          data: checkout,
        });
      } catch (error) {
        return handleCheckoutError(reply, error);
      }
    },
  );
}

/**
 * Convert an HTTP ID value into a positive BigInt.
 *
 * Accepted:
 * - "1"
 * - 1
 * - 1n
 *
 * Rejected:
 * - "abc"
 * - "1.5"
 * - 0
 * - -1
 * - true
 * - false
 * - ""
 * - NaN
 * - Infinity
 */
function parsePositiveBigInt(
  value: unknown,
  errorCode: string,
): bigint {
  // Boolean must be rejected explicitly because:
  // BigInt(true) === 1n
  // BigInt(false) === 0n
  if (typeof value === "boolean") {
    throw new Error(errorCode);
  }

  if (typeof value === "number") {
    if (
      !Number.isInteger(value) ||
      !Number.isSafeInteger(value) ||
      value <= 0
    ) {
      throw new Error(errorCode);
    }

    return BigInt(value);
  }

  if (typeof value === "bigint") {
    if (value <= 0n) {
      throw new Error(errorCode);
    }

    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Only decimal integer strings are accepted.
    if (!/^[1-9]\d*$/.test(trimmed)) {
      throw new Error(errorCode);
    }

    try {
      return BigInt(trimmed);
    } catch {
      throw new Error(errorCode);
    }
  }

  throw new Error(errorCode);
}

/**
 * Validate checkout payment method.
 *
 * Rules:
 * - omitted -> COD
 * - COD -> supported
 * - BANK_TRANSFER -> supported
 * - WALLET -> supported
 * - ONLINE -> exists in schema but is not supported by Checkout
 * - null / invalid type / invalid value -> rejected
 */
function parsePaymentMethod(
  value: unknown,
):
  | "COD"
  | "BANK_TRANSFER"
  | "WALLET" {
  // paymentMethod is optional.
  // If the field is completely omitted, use COD.
  if (value === undefined) {
    return "COD";
  }

  // null is intentionally different from omitted.
  if (value === null) {
    throw new Error("INVALID_PAYMENT_METHOD");
  }

  if (typeof value !== "string") {
    throw new Error("INVALID_PAYMENT_METHOD");
  }

  switch (value) {
    case "COD":
      return "COD";

    case "BANK_TRANSFER":
      return "BANK_TRANSFER";

    case "WALLET":
      return "WALLET";

    case "ONLINE":
      throw new Error(
        "UNSUPPORTED_PAYMENT_METHOD",
      );

    default:
      throw new Error(
        "INVALID_PAYMENT_METHOD",
      );
  }
}

function handleCheckoutError(
  reply: any,
  error: unknown,
) {
  if (!(error instanceof Error)) {
    return reply.code(500).send({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });
  }

  const statusMap: Record<string, number> = {
    INVALID_ACCOUNT_ID: 400,
    INVALID_ADDRESS_ID: 400,

    INVALID_PAYMENT_METHOD: 400,
    UNSUPPORTED_PAYMENT_METHOD: 400,

    ACCOUNT_NOT_FOUND: 404,
    ACCOUNT_PLATFORM_MISMATCH: 400,
    MEMBER_ACCOUNT_REQUIRED: 400,
    ACCOUNT_NOT_ACTIVE: 400,

    ADDRESS_NOT_FOUND: 404,
    ADDRESS_NOT_BELONG_TO_ACCOUNT_PERSON: 400,

    CART_NOT_FOUND: 404,
    CART_EMPTY: 400,

    PRODUCT_NOT_FOUND: 404,
    PRODUCT_NOT_ACTIVE: 400,
    PRODUCT_VARIANT_NOT_FOUND: 404,
    PRODUCT_VARIANT_NOT_ACTIVE: 400,
    INVALID_ITEM_QUANTITY: 400,

    INVALID_SHIPPING_FEE: 400,
    INVALID_DISCOUNT: 400,
    DISCOUNT_EXCEEDS_SUBTOTAL: 400,

    WALLET_NOT_FOUND: 404,
    INSUFFICIENT_WALLET_BALANCE: 400,
    WALLET_BALANCE_UPDATE_FAILED: 400,

    INSUFFICIENT_AVAILABLE_STOCK: 400,
    INVENTORY_NOT_FOUND: 404,
  };

  const statusCode =
    statusMap[error.message] ?? 500;

  return reply.code(statusCode).send({
    success: false,
    error: error.message,
  });
}

