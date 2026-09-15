import { describe, it, expect } from "vitest";
import { clampBoxSize, mmToPt, qrBox, QR_BOX_DEFAULT } from "../sticker-layout";

describe("qrBox", () => {
  it("centres the square on square artwork", () => {
    expect(qrBox(1000, 1000, 40)).toEqual({ left: 300, top: 300, size: 400 });
  });

  // The square is a share of the shorter edge, so it stays a square that fits
  // whichever way round the artwork is.
  it("sizes from the shorter edge on wide artwork", () => {
    expect(qrBox(2000, 1000, 50)).toEqual({ left: 750, top: 250, size: 500 });
  });

  it("sizes from the shorter edge on tall artwork", () => {
    expect(qrBox(1000, 2000, 50)).toEqual({ left: 250, top: 750, size: 500 });
  });

  it("always lands inside the artwork, in whole pixels", () => {
    for (const [w, h] of [
      [999, 999],
      [1601, 1003],
      [640, 2400],
    ]) {
      for (let pct = 20; pct <= 80; pct += 7) {
        const box = qrBox(w, h, pct);
        expect(Number.isInteger(box.left) && Number.isInteger(box.top)).toBe(true);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.top).toBeGreaterThanOrEqual(0);
        expect(box.left + box.size).toBeLessThanOrEqual(w);
        expect(box.top + box.size).toBeLessThanOrEqual(h);
      }
    }
  });

  it("clamps an out-of-range size rather than overflowing", () => {
    expect(qrBox(1000, 1000, 500)).toEqual(qrBox(1000, 1000, 80));
  });
});

describe("clampBoxSize", () => {
  it("keeps the square between 20% and 80%", () => {
    expect(clampBoxSize(5)).toBe(20);
    expect(clampBoxSize(95)).toBe(80);
  });

  it("rounds to a whole percent", () => {
    expect(clampBoxSize(33.6)).toBe(34);
  });

  it("falls back to the default for garbage", () => {
    expect(clampBoxSize(Number.NaN)).toBe(QR_BOX_DEFAULT);
    expect(clampBoxSize(Number.POSITIVE_INFINITY)).toBe(QR_BOX_DEFAULT);
  });
});

describe("mmToPt", () => {
  it("converts an inch to 72 points", () => {
    expect(mmToPt(25.4)).toBeCloseTo(72, 6);
  });
});
