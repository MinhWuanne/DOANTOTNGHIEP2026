
import {
  checkoutService,
  CheckoutInput,
} from "../../services/checkout/checkout.service.js";

export class CheckoutController {
  async checkout(
    accountId: string | number | bigint,
    input: Omit<CheckoutInput, "accountId">,
  ) {
    return checkoutService.checkout({
      accountId: BigInt(accountId),
      ...input,
    });
  }
}

export const checkoutController =
  new CheckoutController();

