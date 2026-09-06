import { describe, it, expect } from "vitest";
import { isEntitled, LAPSED_BEHAVIOUR } from "../entitlements";

describe("isEntitled", () => {
  it("entitles an active subscriber", () => {
    expect(isEntitled("ACTIVE")).toBe(true);
  });

  it("entitles a trialing subscriber", () => {
    expect(isEntitled("TRIALING")).toBe(true);
  });

  it("does not entitle past-due, canceled, or absent subscriptions", () => {
    for (const s of ["PAST_DUE", "CANCELED", null, undefined] as const) {
      expect(isEntitled(s)).toBe(false);
    }
  });
});

describe("LAPSED_BEHAVIOUR", () => {
  it("keeps the relay open so a found item can still be returned", () => {
    // Changing this constant changes what a stranger sees standing over
    // someone's lost helmet. It is deliberately a single named switch.
    expect(LAPSED_BEHAVIOUR).toBe("RELAY_ONLY");
  });
});
