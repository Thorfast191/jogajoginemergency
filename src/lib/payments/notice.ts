// What to tell a customer who comes back from a payment that didn't complete.
//
// Settlement and the payment actions redirect with `?payment=<code>`; this is
// the one place those codes are turned into words, so a new code can't be
// added on one side and silently ignored on the other.

export type PaymentNotice = { tone: "error" | "warning"; text: string };

const NOTICES: Record<string, PaymentNotice> = {
  failed: {
    tone: "error",
    text: "Your payment didn't go through, so nothing was bought. You can try again.",
  },
  cancelled: {
    tone: "warning",
    text: "The payment was cancelled, so nothing was bought. You can try again whenever you're ready.",
  },
  unknown: {
    tone: "error",
    text: "We couldn't match that payment to anything on your account. If money left your account, contact us with the time you paid.",
  },
  unavailable: {
    tone: "error",
    text: "That payment method isn't available right now. Please choose another.",
  },
  error: {
    tone: "error",
    text: "We couldn't reach the payment provider. Please try again in a moment.",
  },
  "unknown-plan": {
    tone: "error",
    text: "That plan isn't available any more. Please pick one of the plans below.",
  },
};

export function paymentNotice(code: string | string[] | undefined): PaymentNotice | null {
  if (typeof code !== "string") return null;
  return Object.hasOwn(NOTICES, code) ? NOTICES[code] : null;
}
