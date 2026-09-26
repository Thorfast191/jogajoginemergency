import { describe, it, expect } from "vitest";
import {
  generateOrderNumber,
  orderMatchesCart,
  orderPlanMatchesCart,
  canEditShipping,
} from "../order";

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

describe("orderMatchesCart — the artwork is part of what was bought", () => {
  const item = (productId: string, themeId: string | null) => ({
    productId,
    quantity: 1,
    unitPriceCents: 29900,
    currency: "BDT",
    themeId,
  });
  const line = (productId: string, themeId: string | null) => ({
    productId,
    qty: 1,
    unitPriceCents: 29900,
    currency: "BDT",
    themeId,
  });

  it("matches when the same theme was chosen", () => {
    expect(orderMatchesCart([item("a", "t1")], [line("a", "t1")])).toBe(true);
  });

  it("does not match when the theme was swapped after the order was placed", () => {
    // Ships one artwork, unlocks another.
    expect(orderMatchesCart([item("a", "t1")], [line("a", "t2")])).toBe(false);
  });

  it("does not match when a theme was added or dropped", () => {
    expect(orderMatchesCart([item("a", null)], [line("a", "t1")])).toBe(false);
    expect(orderMatchesCart([item("a", "t1")], [line("a", null)])).toBe(false);
  });

  it("treats absent and null as the same answer", () => {
    expect(
      orderMatchesCart(
        [{ productId: "a", quantity: 1, unitPriceCents: 29900, currency: "BDT" }],
        [line("a", null)],
      ),
    ).toBe(true);
  });

  it("tells two lines of one product apart by their themes", () => {
    expect(
      orderMatchesCart([item("a", "t1"), item("a", "t2")], [line("a", "t2"), line("a", "t1")]),
    ).toBe(true);
    expect(
      orderMatchesCart([item("a", "t1"), item("a", "t1")], [line("a", "t1"), line("a", "t2")]),
    ).toBe(false);
  });
});

describe("orderPlanMatchesCart — the plan was paid for in the same total", () => {
  it("matches when neither side has a plan", () => {
    expect(
      orderPlanMatchesCart(
        { planId: null, planPriceCents: null },
        { planId: null, planPriceCents: null },
      ),
    ).toBe(true);
  });

  it("matches the same plan at the same price", () => {
    expect(
      orderPlanMatchesCart(
        { planId: "plus", planPriceCents: 49900 },
        { planId: "plus", planPriceCents: 49900 },
      ),
    ).toBe(true);
  });

  it("does not match when a plan was added after the order was placed", () => {
    // The underpayment: the order's total never included a plan.
    expect(
      orderPlanMatchesCart(
        { planId: null, planPriceCents: null },
        { planId: "plus", planPriceCents: 49900 },
      ),
    ).toBe(false);
  });

  it("does not match when the plan was removed", () => {
    expect(
      orderPlanMatchesCart(
        { planId: "plus", planPriceCents: 49900 },
        { planId: null, planPriceCents: null },
      ),
    ).toBe(false);
  });

  it("does not match a different plan", () => {
    expect(
      orderPlanMatchesCart(
        { planId: "plus", planPriceCents: 49900 },
        { planId: "basic", planPriceCents: 49900 },
      ),
    ).toBe(false);
  });

  it("does not match when the plan's price changed since the order was placed", () => {
    expect(
      orderPlanMatchesCart(
        { planId: "plus", planPriceCents: 49900 },
        { planId: "plus", planPriceCents: 29900 },
      ),
    ).toBe(false);
  });
});

describe("canEditShipping — a typo is fixable until the parcel leaves", () => {
  const order = (status: string, fulfillmentStatus: string) => ({ status, fulfillmentStatus });

  it("allows it while the order is still here", () => {
    expect(canEditShipping(order("PENDING", "UNFULFILLED"))).toBe(true);
    expect(canEditShipping(order("PAID", "UNFULFILLED"))).toBe(true);
    // Being printed is still here — this is when a typo is usually noticed.
    expect(canEditShipping(order("PAID", "PROCESSING"))).toBe(true);
  });

  it("refuses once it is with a courier", () => {
    expect(canEditShipping(order("PAID", "SHIPPED"))).toBe(false);
    expect(canEditShipping(order("PAID", "DELIVERED"))).toBe(false);
  });

  it("refuses on a closed order, whatever its fulfilment says", () => {
    expect(canEditShipping(order("CANCELLED", "UNFULFILLED"))).toBe(false);
    expect(canEditShipping(order("REFUNDED", "PROCESSING"))).toBe(false);
  });
});
