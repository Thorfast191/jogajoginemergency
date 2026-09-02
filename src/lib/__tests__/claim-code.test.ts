import { describe, it, expect } from "vitest";
import { generateClaimCode, normalizeClaimCode } from "../claim-code";

const GROUP = "[23456789ABCDEFGHJKLMNPQRSTVWXYZ]{4}";
const FORMAT = new RegExp(`^${GROUP}-${GROUP}-${GROUP}$`);

describe("claim code", () => {
  it("matches the grouped format", () => {
    for (let i = 0; i < 20; i++) expect(generateClaimCode()).toMatch(FORMAT);
  });

  it("uses no lowercase or ambiguous characters", () => {
    const body = generateClaimCode().replace(/-/g, "");
    for (const ch of body) {
      expect("01IOU".includes(ch)).toBe(false);
      expect(ch).toBe(ch.toUpperCase());
    }
  });

  it("normalizes messy input", () => {
    expect(normalizeClaimCode(" k7qf3m9pxr2t ")).toBe("K7QF-3M9P-XR2T");
    expect(normalizeClaimCode("K7QF-3M9P-XR2T")).toBe("K7QF-3M9P-XR2T");
    expect(normalizeClaimCode("k7qf 3m9p_xr2t")).toBe("K7QF-3M9P-XR2T");
  });

  it("is idempotent on a generated code", () => {
    const c = generateClaimCode();
    expect(normalizeClaimCode(c)).toBe(c);
  });
});
