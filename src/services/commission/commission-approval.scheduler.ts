
import { commissionService } from "./commission.service.js";

const INTERVAL_MS = 60_000;

let timer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

async function runCommissionApproval() {
    if (isRunning) {
        return;
    }

    isRunning = true;

    try {
        const approvalResult =
            await commissionService.approveEligibleCommissions();

        if (
            approvalResult.approved > 0 ||
            approvalResult.failed > 0
        ) {
            console.log(
                "[CommissionApprovalScheduler]",
                approvalResult,
            );
        }

        const paymentResult =
            await commissionService.payEligibleCommissions();

        if (
            paymentResult.paid > 0 ||
            paymentResult.failed > 0
        ) {
            console.log(
                "[CommissionPaymentScheduler]",
                paymentResult,
            );
        }
    } catch (error) {
        console.error(
            "[CommissionApprovalScheduler] Failed:",
            error,
        );
    } finally {
        isRunning = false;
    }
}

export function startCommissionApprovalScheduler() {
    if (timer) {
        return;
    }

    timer = setInterval(() => {
        void runCommissionApproval();
    }, INTERVAL_MS);

    timer.unref();

    void runCommissionApproval();

    console.log(
        "[CommissionApprovalScheduler] Started",
    );
}

export function stopCommissionApprovalScheduler() {
    if (!timer) {
        return;
    }

    clearInterval(timer);
    timer = null;

    console.log(
        "[CommissionApprovalScheduler] Stopped",
    );
}
