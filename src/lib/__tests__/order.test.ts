import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "../order";

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
