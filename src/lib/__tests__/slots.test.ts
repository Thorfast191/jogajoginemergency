import { describe, it, expect } from "vitest";
import {
  slotsOwned,
  slotBalance,
  canGenerateTag,
  lineRemaining,
  nextOpenLine,
  type LineCapacity,
} from "../slots";

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

describe("lineRemaining", () => {
  const line = (over: Partial<LineCapacity> = {}): LineCapacity => ({
    orderItemId: "li1",
    productId: "p1",
    themeId: "t1",
    quantity: 1,
    qrSlots: 1,
    tagsUsed: 0,
    ...over,
  });

  it("is capacity minus what the line already spent", () => {
    expect(lineRemaining(line({ quantity: 2, qrSlots: 3, tagsUsed: 4 }))).toBe(2);
  });

  it("is zero, never negative, on an overdrawn line", () => {
    expect(lineRemaining(line({ quantity: 1, qrSlots: 1, tagsUsed: 9 }))).toBe(0);
  });

  it("grants nothing for junk quantities", () => {
    expect(lineRemaining(line({ quantity: Number.NaN }))).toBe(0);
    expect(lineRemaining(line({ qrSlots: -3 }))).toBe(0);
  });
});

describe("nextOpenLine", () => {
  const line = (id: string, over: Partial<LineCapacity> = {}): LineCapacity => ({
    orderItemId: id,
    productId: `prod-${id}`,
    themeId: `theme-${id}`,
    quantity: 1,
    qrSlots: 1,
    tagsUsed: 0,
    ...over,
  });

  it("spends the oldest unused slot first", () => {
    const picked = nextOpenLine([line("old"), line("new")]);
    expect(picked?.orderItemId).toBe("old");
  });

  it("skips lines whose slots are all spent", () => {
    const picked = nextOpenLine([line("spent", { tagsUsed: 1 }), line("fresh")]);
    expect(picked?.orderItemId).toBe("fresh");
  });

  // The bug this function exists to prevent: buy a Classic sticker, then a
  // Night Guardian one, generate two tags. The second tag must come from the
  // Night Guardian line, not a second helping of Classic.
  it("moves on to the next purchase once the first is exhausted", () => {
    const lines = [line("classic", { tagsUsed: 1 }), line("night")];
    expect(nextOpenLine(lines)?.themeId).toBe("theme-night");
  });

  it("returns null when every slot is spent", () => {
    expect(nextOpenLine([line("a", { tagsUsed: 1 })])).toBeNull();
  });

  it("returns null with nothing bought", () => {
    expect(nextOpenLine([])).toBeNull();
  });
});
