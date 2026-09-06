import { describe, it, expect } from "vitest";
import { isTokenStale } from "../token-freshness";

const at = (iso: string) => new Date(iso);
const secs = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

describe("isTokenStale", () => {
  it("treats every token as fresh when the password has never been changed", () => {
    expect(isTokenStale(secs("2026-01-01T10:00:00Z"), null)).toBe(false);
    expect(isTokenStale(secs("2026-01-01T10:00:00Z"), undefined)).toBe(false);
  });

  it("invalidates a token issued before the password changed", () => {
    expect(
      isTokenStale(secs("2026-01-01T09:00:00Z"), at("2026-01-01T10:00:00Z")),
    ).toBe(true);
  });

  it("keeps a token issued after the password changed", () => {
    expect(
      isTokenStale(secs("2026-01-01T11:00:00Z"), at("2026-01-01T10:00:00Z")),
    ).toBe(false);
  });

  it("keeps a token issued in the same second as the change", () => {
    // `iat` has second granularity; a sign-in milliseconds after a reset must
    // not invalidate itself.
    expect(
      isTokenStale(secs("2026-01-01T10:00:00Z"), at("2026-01-01T10:00:00.750Z")),
    ).toBe(false);
  });

  it("fails closed when the token carries no issue time", () => {
    expect(isTokenStale(undefined, at("2026-01-01T10:00:00Z"))).toBe(true);
    expect(isTokenStale(null, at("2026-01-01T10:00:00Z"))).toBe(true);
  });

  it("fails closed on a non-finite issue time", () => {
    expect(isTokenStale(Number.NaN, at("2026-01-01T10:00:00Z"))).toBe(true);
  });
});
