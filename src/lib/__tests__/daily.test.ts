import { describe, it, expect } from "vitest";
import { fillDays } from "../daily";

describe("fillDays", () => {
  const now = new Date("2026-09-15T08:00:00Z");

  it("returns every day in the window, oldest first, with gaps as zero", () => {
    const rows = [
      { day: "2026-09-14", count: 3 },
      { day: "2026-09-12", count: 1 },
    ];
    expect(fillDays(rows, 5, now)).toEqual([
      { day: "2026-09-11", count: 0 },
      { day: "2026-09-12", count: 1 },
      { day: "2026-09-13", count: 0 },
      { day: "2026-09-14", count: 3 },
      { day: "2026-09-15", count: 0 },
    ]);
  });

  it("leaves out rows from outside the window", () => {
    const days = fillDays([{ day: "2026-08-01", count: 9 }], 3, now);
    expect(days).toHaveLength(3);
    expect(days.every((d) => d.count === 0)).toBe(true);
  });

  it("ends on today's UTC day even late in the evening", () => {
    const late = new Date("2026-09-15T23:59:59Z");
    expect(fillDays([], 1, late)).toEqual([{ day: "2026-09-15", count: 0 }]);
  });
});
