import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkLimit, recordHit, rateLimit } from "../rate-limit";

// These cover the in-memory backend, which is the default. The Postgres
// backend shares the same contract but needs a database, so it is exercised by
// the integration checks rather than here.
const opts = { limit: 3, windowMs: 60_000 };
let n = 0;
const freshKey = () => `test-key-${n++}`;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("checkLimit — peek without consuming", () => {
  it("never consumes budget, however many times it is called", async () => {
    const key = freshKey();
    for (let i = 0; i < 20; i++) expect((await checkLimit(key, opts)).allowed).toBe(true);
    expect((await checkLimit(key, opts)).remaining).toBe(3);
  });

  it("reports the budget left after recorded hits", async () => {
    const key = freshKey();
    await recordHit(key, opts);
    expect((await checkLimit(key, opts)).remaining).toBe(2);
    await recordHit(key, opts);
    expect((await checkLimit(key, opts)).remaining).toBe(1);
  });

  it("reports blocked once the budget is spent", async () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) await recordHit(key, opts);
    expect(await checkLimit(key, opts)).toEqual({ allowed: false, remaining: 0 });
  });
});

describe("recordHit — consume", () => {
  it("allows exactly `limit` hits, then blocks", async () => {
    const key = freshKey();
    expect((await recordHit(key, opts)).allowed).toBe(true);
    expect((await recordHit(key, opts)).allowed).toBe(true);
    expect((await recordHit(key, opts)).allowed).toBe(true);
    expect((await recordHit(key, opts)).allowed).toBe(false);
  });

  it("keeps separate budgets per key", async () => {
    const a = freshKey();
    const b = freshKey();
    for (let i = 0; i < 3; i++) await recordHit(a, opts);
    expect((await checkLimit(a, opts)).allowed).toBe(false);
    expect((await checkLimit(b, opts)).allowed).toBe(true);
  });

  it("frees the budget again once the window slides past", async () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) await recordHit(key, opts);
    expect((await checkLimit(key, opts)).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect((await checkLimit(key, opts)).allowed).toBe(true);
    expect((await checkLimit(key, opts)).remaining).toBe(3);
  });

  it("expires hits individually, not as a whole window", async () => {
    const key = freshKey();
    await recordHit(key, opts);
    vi.advanceTimersByTime(30_000);
    await recordHit(key, opts);
    await recordHit(key, opts);
    expect((await checkLimit(key, opts)).allowed).toBe(false);

    // Only the first hit has aged out.
    vi.advanceTimersByTime(30_001);
    expect((await checkLimit(key, opts)).remaining).toBe(1);
  });
});

describe("rateLimit — the original check-and-consume helper", () => {
  it("still behaves as before for existing callers", async () => {
    const key = freshKey();
    expect(await rateLimit(key, opts)).toEqual({ allowed: true, remaining: 2 });
    expect(await rateLimit(key, opts)).toEqual({ allowed: true, remaining: 1 });
    expect(await rateLimit(key, opts)).toEqual({ allowed: true, remaining: 0 });
    expect(await rateLimit(key, opts)).toEqual({ allowed: false, remaining: 0 });
  });

  it("shares one budget with recordHit for the same key", async () => {
    const key = freshKey();
    await recordHit(key, opts);
    await recordHit(key, opts);
    expect((await rateLimit(key, opts)).allowed).toBe(true);
    expect((await rateLimit(key, opts)).allowed).toBe(false);
  });
});
