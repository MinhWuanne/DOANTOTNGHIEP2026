
import Fastify from "fastify";
import cors from "@fastify/cors";
import { prisma } from "./lib/prisma.js";

import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import path from "node:path";

import { accountRoutes } from "./routes/account/account.route.js";
import { personRoutes } from "./routes/person/person.route.js";
import { referralRoutes } from "./routes/referral/referral.route.js";
import { networkRoutes } from "./routes/network/network.route.js";
import { orderRoutes } from "./routes/order/order.route.js";
import { returnRoutes } from "./routes/return/return.route.js";
import { commissionRoutes } from "./routes/commission/commission.route.js";
import { inventoryRoutes } from "./routes/inventory/inventory.route.js";
import { inventoryReceiptRoutes } from "./routes/inventory/inventory-receipt.route.js";
import { inventoryIssueRoutes } from "./routes/inventory/inventory-issue.route.js";

import { authRoutes } from "./routes/auth/auth.route.js";

import { adminRoutes } from "./routes/admin/admin.route.js";
import { adminAuthRoutes } from "./routes/admin/auth/admin-auth.route.js";
import { adminUserAccountRoutes } from "./routes/admin/user-account/admin-user-account.route.js";
import { adminMemberRoutes } from "./routes/admin/member/admin-member.route.js";
import { adminFranchiseRoutes } from "./routes/admin/franchise/admin-franchise.route.js";
import { adminFranchiseAnalyticsRoutes } from "./routes/admin/franchise/admin-franchise-analytics.route.js";
import { adminCategoryRoutes } from "./routes/admin/category/admin-category.route.js";
import { adminProductRoutes } from "./routes/admin/product/admin-product.route.js";
import { adminProductImageRoutes } from "./routes/admin/product/admin-product-image.route.js";


import { adminProductVariantRoutes } from "./routes/admin/product-variant/admin-product-variant.route.js";
import { adminWithdrawalRoutes } from "./routes/admin/withdrawal/admin-withdrawal.route.js";
import { adminOrderRoutes } from "./routes/admin/order/admin-order.route.js";
import { adminReturnRoutes } from "./routes/admin/return/admin-return.route.js";
import { adminCommissionRoutes } from
"./routes/admin/commission/admin-commission.route.js";
import { adminWalletRoutes } from
"./routes/admin/wallet/admin-wallet.route.js";

import { demoClockRoutes } from "./routes/demo-clock/demo-clock.route.js";
import { paymentRoutes } from "./routes/payment/payment.route.js";
import { walletRoutes } from "./routes/wallet/wallet.route.js";
import { cartRoutes } from "./routes/cart/cart.route.js";
import { checkoutRoutes } from "./routes/checkout/checkout.route.js";

import { productRoutes } from "./routes/product/product.route.js";
import { categoryRoutes } from "./routes/category/category.route.js";
import { addressRoutes } from "./routes/address/address.route.js";
import { bankRoutes } from "./routes/bank/bank.route.js";

import {
  complaintRoutes,
} from "./routes/complaint/complaint.route.js";



const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: "http://localhost:5173",
  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],
});

// ============================================================
// PRODUCT IMAGE UPLOAD
// ============================================================

await app.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 10,
    parts: 11,
  },
});

// ============================================================
// STATIC FILES
// ============================================================

await app.register(fastifyStatic, {
  root: path.resolve(process.cwd(), "uploads"),
  prefix: "/uploads/",
});

// ============================================================
// BIGINT SERIALIZATION
// ============================================================

app.addHook(
  "preSerialization",
  async (_request, _reply, payload) => {
    return JSON.parse(
      JSON.stringify(payload, (_key, value) =>
        typeof value === "bigint"
          ? value.toString()
          : value,
      ),
    );
  },
);

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================


app.setErrorHandler(
  (error, request, reply) => {
    // ========================================================
    // FASTIFY SCHEMA VALIDATION ERROR
    // ========================================================

    const validationError =
      error &&
      typeof error === "object" &&
      "validation" in error;

    if (validationError) {
      const validations = Array.isArray(
        error.validation,
      )
        ? error.validation
        : [];

      // ------------------------------------------------------
      // POST /auth/register
      // ------------------------------------------------------

      if (request.url === "/auth/register") {
        // Missing fullName
        const missingFullName =
          validations.some(
            (item: {
              keyword?: string;
              params?: {
                missingProperty?: string;
              };
            }) =>
              item.keyword === "required" &&
              item.params?.missingProperty ===
                "fullName",
          );

        if (missingFullName) {
          return reply.code(400).send({
            success: false,
            error: "FULL_NAME_REQUIRED",
          });
        }

        // Missing password
        const missingPassword =
          validations.some(
            (item: {
              keyword?: string;
              params?: {
                missingProperty?: string;
              };
            }) =>
              item.keyword === "required" &&
              item.params?.missingProperty ===
                "password",
          );

        if (missingPassword) {
          return reply.code(400).send({
            success: false,
            error: "PASSWORD_TOO_SHORT",
          });
        }

        // Missing both email and phone
        //
        // Schema dùng:
        //
        // anyOf: [
        //   { required: ["email"] },
        //   { required: ["phone"] },
        // ]
        //
        // Khi cả hai đều thiếu, Fastify phát sinh
        // validation error với keyword = "anyOf".
        const missingContact =
          validations.some(
            (item: {
              keyword?: string;
            }) =>
              item.keyword === "anyOf",
          );

        if (missingContact) {
          return reply.code(400).send({
            success: false,
            error: "EMAIL_OR_PHONE_REQUIRED",
          });
        }
      }

      // ------------------------------------------------------
      // OTHER VALIDATION ERRORS
      // ------------------------------------------------------

      return reply.code(400).send({
        success: false,
        error: "VALIDATION_ERROR",
      });
    }

    // ========================================================
    // OTHER / INTERNAL ERROR
    // ========================================================

    request.log.error(error);

    return reply.code(500).send({
      success: false,
      error: "INTERNAL_SERVER_ERROR",
    });
  },
);



// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/health", async () => {
  await prisma.$queryRaw`SELECT 1`;

  return {
    success: true,
    message: "Ecommerce API is running",
    database: "connected",
  };
});

// ============================================================
// ROUTES
// ============================================================

app.register(accountRoutes);
app.register(personRoutes);
app.register(referralRoutes);
app.register(networkRoutes);
app.register(orderRoutes);
app.register(commissionRoutes);
app.register(inventoryRoutes);
app.register(inventoryReceiptRoutes);
app.register(inventoryIssueRoutes);

app.register(authRoutes);

app.register(adminRoutes);
app.register(adminAuthRoutes);
app.register(adminUserAccountRoutes);
app.register(adminMemberRoutes);
app.register(adminFranchiseAnalyticsRoutes);
app.register(adminFranchiseRoutes);
app.register(adminCategoryRoutes);
app.register(adminProductRoutes);

app.register(adminProductImageRoutes);
app.register(adminProductVariantRoutes);
app.register(adminWithdrawalRoutes);
app.register(adminOrderRoutes);
app.register(adminReturnRoutes);
app.register(adminCommissionRoutes);
app.register(adminWalletRoutes);

app.register(demoClockRoutes);

app.register(paymentRoutes);
app.register(walletRoutes);

app.register(cartRoutes);
app.register(checkoutRoutes);

app.register(productRoutes);
app.register(categoryRoutes);
app.register(addressRoutes);
app.register(bankRoutes);

app.register(complaintRoutes);

app.register(returnRoutes);


export default app;

