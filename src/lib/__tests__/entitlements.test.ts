import { describe, it, expect } from "vitest";
import { entitlementsFor, isEntitled, FREE_SCAN_HISTORY } from "../entitlements";

describe("entitlementsFor", () => {
  it("entitles an active subscriber to everything paid", () => {
    expect(entitlementsFor("ACTIVE")).toEqual({
      portfolio: true,
      premiumThemes: true,
      fullScanHistory: true,
    });
  });

  it("entitles a trialing subscriber", () => {
    expect(isEntitled("TRIALING")).toBe(true);
  });

  it("does not entitle past-due, canceled, or absent subscriptions", () => {
    for (const s of ["PAST_DUE", "CANCELED", null, undefined] as const) {
      expect(isEntitled(s)).toBe(false);
      expect(entitlementsFor(s)).toEqual({
        portfolio: false,
        premiumThemes: false,
        fullScanHistory: false,
      });
    }
  });

  it("caps free scan history at a small, useful number", () => {
    expect(FREE_SCAN_HISTORY).toBe(5);
  });
});
