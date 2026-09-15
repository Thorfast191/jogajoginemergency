import { describe, it, expect } from "vitest";
import { printReadiness } from "../print";

describe("printReadiness", () => {
  it("is trivially ready when there is nothing to print", () => {
    expect(printReadiness([])).toEqual({ needed: 0, generated: 0, ready: true });
  });

  it("waits while a line still has an unspent slot", () => {
    expect(printReadiness([{ quantity: 2, qrSlots: 1, tagsGenerated: 1 }])).toEqual({
      needed: 2,
      generated: 1,
      ready: false,
    });
  });

  it("counts a multi-slot sticker by its slots, not its quantity", () => {
    expect(printReadiness([{ quantity: 1, qrSlots: 2, tagsGenerated: 2 }])).toEqual({
      needed: 2,
      generated: 2,
      ready: true,
    });
  });

  // A replacement QR an admin issued adds a tag to a line without it being a
  // slot. Extra tags on one line must not paper over a missing one on another.
  it("caps each line at its own slots, so extras on one line don't cover another", () => {
    const r = printReadiness([
      { quantity: 1, qrSlots: 1, tagsGenerated: 3 },
      { quantity: 1, qrSlots: 2, tagsGenerated: 0 },
    ]);
    expect(r).toEqual({ needed: 3, generated: 1, ready: false });
  });

  it("is ready once every line is covered", () => {
    const r = printReadiness([
      { quantity: 2, qrSlots: 1, tagsGenerated: 2 },
      { quantity: 1, qrSlots: 2, tagsGenerated: 2 },
    ]);
    expect(r.ready).toBe(true);
  });

  it("treats nonsense counts as zero rather than as progress", () => {
    const r = printReadiness([{ quantity: Number.NaN, qrSlots: -3, tagsGenerated: 9 }]);
    expect(r).toEqual({ needed: 0, generated: 0, ready: true });
  });
});
