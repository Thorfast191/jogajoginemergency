import type { PaymentGateway } from "./types";

/**
 * A gateway that takes no money.
 *
 * It exists so the app is developable without merchant credentials, and it is
 * refused outright in live mode by `demoEnabled()`. The redirect goes straight
 * back to our own callback, so the settlement path under test is the same one
 * the real providers use.
 */
export const demoGateway: PaymentGateway = {
  id: "DEMO",
  label: "Demo (no real payment)",

  async initiate(intent) {
    const url = new URL(intent.callbackUrl);
    url.searchParams.set("payment", intent.paymentId);
    url.searchParams.set("demo", "success");
    return { redirectUrl: url.toString(), gatewayPaymentId: `demo_${intent.paymentId}` };
  },

  async verify(params, payment) {
    const outcome = params.demo ?? "success";
    if (outcome === "cancel") return { status: "CANCELLED", reason: "Cancelled in demo mode." };
    if (outcome === "fail") return { status: "FAILED", reason: "Failed in demo mode." };

    // Reports success for the wrong amount, so the settlement guard against a
    // tampered or mismatched callback can be exercised locally.
    if (outcome === "mismatch") {
      return {
        status: "SUCCEEDED",
        providerRef: `demo_${Date.now()}`,
        amount: "1.00",
        currency: payment.currency,
      };
    }

    return {
      status: "SUCCEEDED",
      providerRef: `demo_${Date.now()}`,
      amount: (payment.amountCents / 100).toFixed(2),
      currency: payment.currency,
    };
  },
};
