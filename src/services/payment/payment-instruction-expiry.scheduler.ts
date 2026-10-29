
import {
  PaymentInstructionStatus,
} from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import {
  paymentInstructionService,
} from "./payment-instruction.service.js";

const INTERVAL_MS = 15_000;

let timer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

async function runPaymentInstructionExpiry() {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const now = new Date();

    const expiredInstructions =
      await prisma.paymentInstruction.findMany({
        where: {
          status: {
            in: [
              PaymentInstructionStatus.WAITING,
              PaymentInstructionStatus.PARTIALLY_PAID,
            ],
          },
          expiresAt: {
            lte: now,
          },
        },
        select: {
          id: true,
        },
        orderBy: {
          expiresAt: "asc",
        },
        take: 100,
      });

    for (const instruction of expiredInstructions) {
      try {
        await paymentInstructionService.expireInstruction(
          instruction.id,
        );
      } catch (error) {
        console.error(
          "[PaymentInstructionExpiryScheduler] Failed to expire instruction:",
          instruction.id.toString(),
          error,
        );
      }
    }

    if (expiredInstructions.length > 0) {
      console.log(
        "[PaymentInstructionExpiryScheduler] Processed:",
        expiredInstructions.length,
      );
    }
  } catch (error) {
    console.error(
      "[PaymentInstructionExpiryScheduler] Failed:",
      error,
    );
  } finally {
    isRunning = false;
  }
}

export function startPaymentInstructionExpiryScheduler() {
  if (timer) {
    return;
  }

  timer = setInterval(() => {
    void runPaymentInstructionExpiry();
  }, INTERVAL_MS);

  timer.unref();

  void runPaymentInstructionExpiry();

  console.log(
    "[PaymentInstructionExpiryScheduler] Started",
  );
}

export function stopPaymentInstructionExpiryScheduler() {
  if (!timer) {
    return;
  }

  clearInterval(timer);
  timer = null;

  console.log(
    "[PaymentInstructionExpiryScheduler] Stopped",
  );
}
