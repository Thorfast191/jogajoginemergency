import { describe, it, expect } from "vitest";
import { paymentNotice } from "../payments/notice";

describe("paymentNotice — every outcome a payment redirect can carry has words", () => {
  it.each(["failed", "cancelled", "unknown", "unavailable", "error", "unknown-plan"])(
    "explains %s",
    (code) => {
      const notice = paymentNotice(code);
      expect(notice).not.toBeNull();
      expect(notice!.text.length).toBeGreaterThan(20);
    },
  );

  it("says nothing without a code, or with one it doesn't know", () => {
    expect(paymentNotice(undefined)).toBeNull();
    expect(paymentNotice("")).toBeNull();
    expect(paymentNotice("<script>")).toBeNull();
  });

  it("ignores inherited object keys and repeated parameters", () => {
    expect(paymentNotice("constructor")).toBeNull();
    expect(paymentNotice("toString")).toBeNull();
    expect(paymentNotice(["failed", "failed"])).toBeNull();
  });

  it("a cancellation is a warning, a failure is an error", () => {
    expect(paymentNotice("cancelled")!.tone).toBe("warning");
    expect(paymentNotice("failed")!.tone).toBe("error");
  });
});
