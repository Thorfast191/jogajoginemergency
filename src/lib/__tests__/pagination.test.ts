import { describe, it, expect } from "vitest";
import { pageCount, pageParams } from "../pagination";

describe("pageParams", () => {
  it("turns a page number into an offset", () => {
    expect(pageParams("3")).toEqual({ page: 3, skip: 100, take: 50 });
    expect(pageParams("3", 20)).toEqual({ page: 3, skip: 40, take: 20 });
  });

  // The value comes straight from the query string.
  it("falls back to the first page for anything that isn't a positive page number", () => {
    expect(pageParams(undefined).page).toBe(1);
    expect(pageParams("0").page).toBe(1);
    expect(pageParams("-2").page).toBe(1);
    expect(pageParams("abc").page).toBe(1);
  });

  it("drops a fractional page to the whole page", () => {
    expect(pageParams("2.7").page).toBe(2);
  });
});

describe("pageCount", () => {
  it("always has at least one page", () => {
    expect(pageCount(0)).toBe(1);
  });

  it("rounds up a partial last page", () => {
    expect(pageCount(50)).toBe(1);
    expect(pageCount(51)).toBe(2);
    expect(pageCount(101)).toBe(3);
    expect(pageCount(10, 20)).toBe(1);
  });
});
