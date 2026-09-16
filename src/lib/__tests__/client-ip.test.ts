import { describe, it, expect } from "vitest";
import { clientIpFrom, trustedHops } from "../client-ip";

const xff = (forwardedFor: string | null, realIp: string | null = null) => ({ forwardedFor, realIp });

describe("clientIpFrom", () => {
  // The attack: anyone can put anything in X-Forwarded-For. Behind one proxy,
  // the proxy appends the address it actually saw, so the *last* entry is the
  // trustworthy one and everything to its left is the caller's own invention.
  it("takes the address the trusted proxy appended, not the one the caller claimed", () => {
    expect(clientIpFrom(xff("1.2.3.4, 203.0.113.9"), 1)).toBe("203.0.113.9");
    expect(clientIpFrom(xff("evil, evil2, 203.0.113.9"), 1)).toBe("203.0.113.9");
  });

  it("counts back one entry per trusted proxy", () => {
    expect(clientIpFrom(xff("client, edge, origin"), 2)).toBe("edge");
    expect(clientIpFrom(xff("client, edge, origin"), 3)).toBe("client");
  });

  it("never runs off the start of the chain", () => {
    expect(clientIpFrom(xff("only-one"), 5)).toBe("only-one");
  });

  it("ignores forwarding headers entirely when no proxy is trusted", () => {
    expect(clientIpFrom(xff("1.2.3.4"), 0)).toBe("unknown");
    expect(clientIpFrom(xff(null, "1.2.3.4"), 0)).toBe("unknown");
  });

  it("falls back to x-real-ip only when there is no forwarded chain", () => {
    expect(clientIpFrom(xff(null, "203.0.113.9"), 1)).toBe("203.0.113.9");
    expect(clientIpFrom(xff("1.2.3.4, 203.0.113.9", "10.0.0.1"), 1)).toBe("203.0.113.9");
  });

  it("copes with whitespace, empty entries and a missing header", () => {
    expect(clientIpFrom(xff("  1.2.3.4 ,  203.0.113.9  "), 1)).toBe("203.0.113.9");
    expect(clientIpFrom(xff("1.2.3.4, , "), 1)).toBe("1.2.3.4");
    expect(clientIpFrom(xff(null), 1)).toBe("unknown");
    expect(clientIpFrom(xff(""), 1)).toBe("unknown");
  });
});

describe("trustedHops", () => {
  it("trusts one proxy by default, matching the documented deployment", () => {
    expect(trustedHops({})).toBe(1);
  });

  it("reads a configured hop count", () => {
    expect(trustedHops({ TRUSTED_PROXY_HOPS: "2" })).toBe(2);
    expect(trustedHops({ TRUSTED_PROXY_HOPS: "0" })).toBe(0);
  });

  it("refuses nonsense rather than trusting an unknown number of hops", () => {
    expect(trustedHops({ TRUSTED_PROXY_HOPS: "lots" })).toBe(1);
    expect(trustedHops({ TRUSTED_PROXY_HOPS: "-3" })).toBe(1);
  });
});
