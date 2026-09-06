import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { checkLimit, recordHit, rateLimit } from "../rate-limit";

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
  it("never consumes budget, however many times it is called", () => {
    const key = freshKey();
    for (let i = 0; i < 20; i++) expect(checkLimit(key, opts).allowed).toBe(true);
    expect(checkLimit(key, opts).remaining).toBe(3);
  });

  it("reports the budget left after recorded hits", () => {
    const key = freshKey();
    recordHit(key, opts);
    expect(checkLimit(key, opts).remaining).toBe(2);
    recordHit(key, opts);
    expect(checkLimit(key, opts).remaining).toBe(1);
  });

  it("reports blocked once the budget is spent", () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) recordHit(key, opts);
    expect(checkLimit(key, opts)).toEqual({ allowed: false, remaining: 0 });
  });
});

describe("recordHit — consume", () => {
  it("allows exactly `limit` hits, then blocks", () => {
    const key = freshKey();
    expect(recordHit(key, opts).allowed).toBe(true);
    expect(recordHit(key, opts).allowed).toBe(true);
    expect(recordHit(key, opts).allowed).toBe(true);
    expect(recordHit(key, opts).allowed).toBe(false);
  });

  it("keeps separate budgets per key", () => {
    const a = freshKey();
    const b = freshKey();
    for (let i = 0; i < 3; i++) recordHit(a, opts);
    expect(checkLimit(a, opts).allowed).toBe(false);
    expect(checkLimit(b, opts).allowed).toBe(true);
  });

  it("frees the budget again once the window slides past", () => {
    const key = freshKey();
    for (let i = 0; i < 3; i++) recordHit(key, opts);
    expect(checkLimit(key, opts).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkLimit(key, opts).allowed).toBe(true);
    expect(checkLimit(key, opts).remaining).toBe(3);
  });

  it("expires hits individually, not as a whole window", () => {
    const key = freshKey();
    recordHit(key, opts);
    vi.advanceTimersByTime(30_000);
    recordHit(key, opts);
    recordHit(key, opts);
    expect(checkLimit(key, opts).allowed).toBe(false);

    // Only the first hit has aged out.
    vi.advanceTimersByTime(30_001);
    expect(checkLimit(key, opts).remaining).toBe(1);
  });
});

describe("rateLimit — the original check-and-consume helper", () => {
  it("still behaves as before for existing callers", () => {
    const key = freshKey();
    expect(rateLimit(key, opts)).toEqual({ allowed: true, remaining: 2 });
    expect(rateLimit(key, opts)).toEqual({ allowed: true, remaining: 1 });
    expect(rateLimit(key, opts)).toEqual({ allowed: true, remaining: 0 });
    expect(rateLimit(key, opts)).toEqual({ allowed: false, remaining: 0 });
  });

  it("shares one budget with recordHit for the same key", () => {
    const key = freshKey();
    recordHit(key, opts);
    recordHit(key, opts);
    expect(rateLimit(key, opts).allowed).toBe(true);
    expect(rateLimit(key, opts).allowed).toBe(false);
  });
});
