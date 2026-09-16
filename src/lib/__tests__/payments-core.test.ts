import { describe, it, expect } from "vitest";
import { toCents, amountMatches, nextPaymentStatus, paymentCoversOrder } from "../payments/core";

describe("toCents — gateways report decimal strings, we store integers", () => {
  it("parses whole and fractional amounts", () => {
    expect(toCents("299")).toBe(29900);
    expect(toCents("299.00")).toBe(29900);
    expect(toCents("299.5")).toBe(29950);
    expect(toCents("299.49")).toBe(29949);
  });

  it("handles numbers as well as strings", () => {
    expect(toCents(499)).toBe(49900);
    expect(toCents(499.5)).toBe(49950);
  });

  it("does not drift on values that float arithmetic gets wrong", () => {
    // 1.1 * 100 is 110.00000000000001 in IEEE 754.
    expect(toCents("1.10")).toBe(110);
    expect(toCents("8.20")).toBe(820);
    expect(toCents("1234.35")).toBe(123435);
  });

  it("ignores separators and currency noise a gateway may include", () => {
    expect(toCents("1,299.00")).toBe(129900);
    expect(toCents(" 299.00 ")).toBe(29900);
  });

  it("returns null for anything it cannot read, rather than guessing", () => {
    for (const v of ["", "abc", null, undefined, Number.NaN, "1.2.3"]) {
      expect(toCents(v as never)).toBeNull();
    }
  });
});

describe("amountMatches — the gateway's figure must equal the order", () => {
  it("accepts the exact amount in the expected currency", () => {
    expect(amountMatches(29900, "299.00", "BDT", "BDT")).toBe(true);
  });

  it("rejects a short payment", () => {
    // Someone editing the amount before it reaches the gateway must not get
    // a fulfilled order for less money.
    expect(amountMatches(29900, "1.00", "BDT", "BDT")).toBe(false);
  });

  it("rejects an overpayment too, since it signals a mismatched record", () => {
    expect(amountMatches(29900, "999.00", "BDT", "BDT")).toBe(false);
  });

  it("rejects a different currency even when the number matches", () => {
    expect(amountMatches(29900, "299.00", "BDT", "USD")).toBe(false);
  });

  it("is case-insensitive about the currency code", () => {
    expect(amountMatches(29900, "299.00", "BDT", "bdt")).toBe(true);
  });

  it("rejects an unreadable amount", () => {
    expect(amountMatches(29900, "lots", "BDT", "BDT")).toBe(false);
  });
});

describe("paymentCoversOrder — a payment only settles the order it was for", () => {
  const order = { totalCents: 149500, currency: "BDT" };

  it("accepts a payment for the whole order", () => {
    expect(paymentCoversOrder({ amountCents: 149500, currency: "BDT" }, order)).toBe(true);
  });

  it("rejects a payment for less than the order", () => {
    // A retried checkout once billed the (smaller) current cart against the
    // original order, so one sticker's price paid for five.
    expect(paymentCoversOrder({ amountCents: 29900, currency: "BDT" }, order)).toBe(false);
  });

  it("rejects a payment for more than the order", () => {
    expect(paymentCoversOrder({ amountCents: 299000, currency: "BDT" }, order)).toBe(false);
  });

  it("rejects a payment in another currency", () => {
    expect(paymentCoversOrder({ amountCents: 149500, currency: "USD" }, order)).toBe(false);
  });

  it("is case-insensitive about the currency code", () => {
    expect(paymentCoversOrder({ amountCents: 149500, currency: "bdt" }, order)).toBe(true);
  });
});

describe("nextPaymentStatus — callbacks arrive twice, and out of order", () => {
  it("applies a settlement to a pending payment", () => {
    expect(nextPaymentStatus("PENDING", "SUCCEEDED")).toBe("SUCCEEDED");
    expect(nextPaymentStatus("PENDING", "FAILED")).toBe("FAILED");
    expect(nextPaymentStatus("PENDING", "CANCELLED")).toBe("CANCELLED");
  });

  it("ignores a repeat of a settlement already applied", () => {
    expect(nextPaymentStatus("SUCCEEDED", "SUCCEEDED")).toBeNull();
    expect(nextPaymentStatus("FAILED", "FAILED")).toBeNull();
  });

  it("never downgrades a succeeded payment", () => {
    // A late failure callback after money has been taken must not un-fulfil
    // an order.
    expect(nextPaymentStatus("SUCCEEDED", "FAILED")).toBeNull();
    expect(nextPaymentStatus("SUCCEEDED", "CANCELLED")).toBeNull();
    expect(nextPaymentStatus("SUCCEEDED", "PENDING")).toBeNull();
  });

  it("allows a late success after a failure or cancellation", () => {
    expect(nextPaymentStatus("FAILED", "SUCCEEDED")).toBe("SUCCEEDED");
    expect(nextPaymentStatus("CANCELLED", "SUCCEEDED")).toBe("SUCCEEDED");
  });

  it("ignores a pending callback for an already-settled payment", () => {
    expect(nextPaymentStatus("FAILED", "PENDING")).toBeNull();
  });
});
