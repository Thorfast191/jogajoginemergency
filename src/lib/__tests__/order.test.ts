import { describe, it, expect } from "vitest";
import { generateOrderNumber, orderMatchesCart } from "../order";

describe("generateOrderNumber", () => {
  it("has the JJ- prefix and 6 unambiguous chars", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateOrderNumber()).toMatch(/^JJ-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    }
  });
  it("is practically unique across a batch", () => {
    const seen = new Set(Array.from({ length: 500 }, () => generateOrderNumber()));
    expect(seen.size).toBeGreaterThan(495);
  });
});

describe("orderMatchesCart — retrying a checkout must buy what was ordered", () => {
  const item = (productId: string, quantity: number, unitPriceCents = 29900, currency = "BDT") => ({
    productId,
    quantity,
    unitPriceCents,
    currency,
  });
  const line = (productId: string, qty: number, unitPriceCents = 29900, currency = "BDT") => ({
    productId,
    qty,
    unitPriceCents,
    currency,
  });

  it("matches the same lines in any order", () => {
    expect(
      orderMatchesCart([item("a", 1), item("b", 2)], [line("b", 2), line("a", 1)]),
    ).toBe(true);
  });

  it("does not match when a quantity changed", () => {
    // The underpayment: five on the order, one in the cart.
    expect(orderMatchesCart([item("a", 5)], [line("a", 1)])).toBe(false);
  });

  it("does not match when a line was added or removed", () => {
    expect(orderMatchesCart([item("a", 1)], [line("a", 1), line("b", 1)])).toBe(false);
    expect(orderMatchesCart([item("a", 1), item("b", 1)], [line("a", 1)])).toBe(false);
  });

  it("does not match when a price changed since the order was placed", () => {
    expect(orderMatchesCart([item("a", 1, 29900)], [line("a", 1, 34900)])).toBe(false);
  });

  it("does not match when the currency changed", () => {
    expect(orderMatchesCart([item("a", 1, 29900, "BDT")], [line("a", 1, 29900, "USD")])).toBe(false);
  });

  it("never matches an empty cart", () => {
    expect(orderMatchesCart([item("a", 1)], [])).toBe(false);
    expect(orderMatchesCart([], [])).toBe(false);
  });
});
