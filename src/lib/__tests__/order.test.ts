import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "../order";
import { parseCheckoutParams } from "../cart";

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

describe("parseCheckoutParams", () => {
  it("defaults quantity to 1", () => {
    expect(parseCheckoutParams({ product: "bike-sticker" })).toEqual({
      productSlug: "bike-sticker",
      quantity: 1,
    });
  });
  it("clamps quantity to 1..10", () => {
    expect(parseCheckoutParams({ product: "x", qty: "0" })?.quantity).toBe(1);
    expect(parseCheckoutParams({ product: "x", qty: "99" })?.quantity).toBe(10);
    expect(parseCheckoutParams({ product: "x", qty: "3" })?.quantity).toBe(3);
    expect(parseCheckoutParams({ product: "x", qty: "abc" })?.quantity).toBe(1);
  });
  it("reads from URLSearchParams too", () => {
    expect(parseCheckoutParams(new URLSearchParams("product=helmet-sticker&qty=2"))).toEqual({
      productSlug: "helmet-sticker",
      quantity: 2,
    });
  });
  it("returns null with no product", () => {
    expect(parseCheckoutParams({})).toBeNull();
    expect(parseCheckoutParams({ qty: "3" })).toBeNull();
  });
});
