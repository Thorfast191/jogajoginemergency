import { describe, it, expect } from "vitest";
import { isSafeNext } from "../nav";

describe("isSafeNext", () => {
  it("accepts a plain path", () => expect(isSafeNext("/checkout?product=x")).toBe(true));
  it("rejects protocol-relative", () => expect(isSafeNext("//evil.com")).toBe(false));
  it("rejects backslash trick", () => expect(isSafeNext("/\\evil.com")).toBe(false));
  it("rejects absolute url", () => expect(isSafeNext("https://evil.com")).toBe(false));
  it("rejects empty / nullish", () => {
    expect(isSafeNext("")).toBe(false);
    expect(isSafeNext(null)).toBe(false);
    expect(isSafeNext(undefined)).toBe(false);
  });
});
