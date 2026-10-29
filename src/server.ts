import "dotenv/config";

import {
  startCommissionApprovalScheduler,
  stopCommissionApprovalScheduler,
} from "./services/commission/commission-approval.scheduler.js";

import {
  startPaymentInstructionExpiryScheduler,
  stopPaymentInstructionExpiryScheduler,
} from "./services/payment/payment-instruction-expiry.scheduler.js";

import {
  startOrderDeliveryScheduler,
  stopOrderDeliveryScheduler,
} from "./services/order/order-delivery.scheduler.js";

import app from "./app.js";

app.addHook("onClose", async () => {
  stopCommissionApprovalScheduler();
  stopPaymentInstructionExpiryScheduler();
  stopOrderDeliveryScheduler();
});

const start = async () => {
  try {
    const port = Number(process.env.PORT ?? 3000);

    await app.listen({
      port,
      host: "0.0.0.0",
    });

    startCommissionApprovalScheduler();
    startPaymentInstructionExpiryScheduler();
    startOrderDeliveryScheduler();

    console.log(`Server running at http://localhost:${port}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
