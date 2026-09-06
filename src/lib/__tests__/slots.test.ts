import { describe, it, expect } from "vitest";
import { slotsOwned, slotBalance, canGenerateTag } from "../slots";

describe("slotsOwned", () => {
  it("multiplies quantity by the slots each product grants", () => {
    expect(slotsOwned([{ quantity: 2, qrSlots: 1 }])).toBe(2);
    expect(slotsOwned([{ quantity: 3, qrSlots: 4 }])).toBe(12);
  });

  it("sums across order lines", () => {
    expect(slotsOwned([{ quantity: 2, qrSlots: 1 }, { quantity: 1, qrSlots: 5 }])).toBe(7);
  });

  it("is zero with no purchases", () => {
    expect(slotsOwned([])).toBe(0);
  });

  it("ignores negative or non-finite values rather than granting slots", () => {
    expect(slotsOwned([{ quantity: -5, qrSlots: 3 }])).toBe(0);
    expect(slotsOwned([{ quantity: 2, qrSlots: -1 }])).toBe(0);
    expect(slotsOwned([{ quantity: Number.NaN, qrSlots: 3 }])).toBe(0);
  });
});

describe("slotBalance", () => {
  it("reports what is left after tags are generated", () => {
    expect(slotBalance([{ quantity: 3, qrSlots: 1 }], 1)).toEqual({
      owned: 3,
      used: 1,
      available: 2,
    });
  });

  it("never reports negative availability if somehow overdrawn", () => {
    expect(slotBalance([{ quantity: 1, qrSlots: 1 }], 5).available).toBe(0);
  });
});

describe("canGenerateTag", () => {
  it("allows generation only against an unused slot", () => {
    expect(canGenerateTag(slotBalance([{ quantity: 1, qrSlots: 1 }], 0))).toBe(true);
    expect(canGenerateTag(slotBalance([{ quantity: 1, qrSlots: 1 }], 1))).toBe(false);
  });

  it("refuses an account that has never bought a sticker", () => {
    expect(canGenerateTag(slotBalance([], 0))).toBe(false);
  });
});
