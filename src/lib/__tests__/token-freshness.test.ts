import { describe, it, expect } from "vitest";
import { isTokenStale, latest } from "../token-freshness";

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

describe("latest", () => {
  it("is null when nothing has ever been changed", () => {
    expect(latest(null, undefined)).toBeNull();
    expect(latest()).toBeNull();
  });

  it("returns the later of the changes, whichever argument it is", () => {
    const early = at("2026-01-01T10:00:00Z");
    const late = at("2026-02-01T10:00:00Z");
    expect(latest(early, late)).toEqual(late);
    expect(latest(late, early)).toEqual(late);
    expect(latest(null, early)).toEqual(early);
  });

  // A demoted admin still holds a token that says ADMIN. The role change has
  // to revoke it even though the password never changed.
  it("makes a token stale when only the role changed after it was issued", () => {
    const passwordChangedAt = at("2026-01-01T08:00:00Z");
    const roleChangedAt = at("2026-01-01T12:00:00Z");
    expect(
      isTokenStale(secs("2026-01-01T10:00:00Z"), latest(passwordChangedAt, roleChangedAt)),
    ).toBe(true);
  });
});
