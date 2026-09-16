// Pure helpers shared by every payment gateway.
//
// Gateways report money as decimal strings and re-send callbacks freely, so
// the two things most likely to go wrong — reading an amount, and applying the
// same settlement twice — live here where they can be tested without a network.

export type SettleStatus = "SUCCEEDED" | "FAILED" | "CANCELLED" | "PENDING";

/**
 * Parse a gateway's amount into integer minor units.
 *
 * Done by string surgery rather than `Math.round(Number(v) * 100)` because
 * that expression is wrong for values like 1.10, which IEEE 754 stores as
 * 1.1000000000000001.
 */
export function toCents(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;

  const raw = String(value).trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return null;

  const negative = raw.startsWith("-");
  const [whole, frac = ""] = raw.replace(/^-/, "").split(".");
  const cents = Number(whole) * 100 + Number((frac + "00").slice(0, 2));
  if (!Number.isFinite(cents)) return null;

  return negative ? -cents : cents;
}

/**
 * Whether the gateway's reported amount and currency match what we billed.
 *
 * Both directions matter: a short payment is an attacker editing the amount in
 * flight, and an overpayment means the callback belongs to a different record.
 * Either way the order must not be fulfilled on that callback.
 */
export function amountMatches(
  expectedCents: number,
  reportedAmount: string | number | null | undefined,
  expectedCurrency: string,
  reportedCurrency: string | null | undefined,
): boolean {
  const cents = toCents(reportedAmount);
  if (cents === null) return false;
  if ((reportedCurrency ?? "").toUpperCase() !== expectedCurrency.toUpperCase()) return false;
  return cents === expectedCents;
}

/**
 * Whether a payment is for the whole of the order it is attached to.
 *
 * The gateway check above proves the provider took what the payment row asked
 * for. This proves the payment row asked for what the order costs — without
 * it, any path that bills a different amount against an existing order turns
 * a small payment into a large fulfilment.
 */
export function paymentCoversOrder(
  payment: { amountCents: number; currency: string },
  order: { totalCents: number; currency: string },
): boolean {
  return (
    payment.amountCents === order.totalCents &&
    payment.currency.toUpperCase() === order.currency.toUpperCase()
  );
}

const SETTLED: ReadonlySet<SettleStatus> = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);

/**
 * The status a payment should move to, or null to leave it alone.
 *
 * Providers retry callbacks, and a browser redirect can race the server-to-
 * server notification, so this has to be safe to run repeatedly. A success is
 * final: nothing downgrades it, because the money has already moved.
 */
export function nextPaymentStatus(
  current: SettleStatus,
  incoming: SettleStatus,
): SettleStatus | null {
  if (current === "SUCCEEDED") return null;
  if (incoming === "PENDING") return null;
  if (!SETTLED.has(incoming)) return null;
  if (current === incoming) return null;
  return incoming;
}
