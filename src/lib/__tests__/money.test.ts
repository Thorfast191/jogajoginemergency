import { describe, it, expect } from "vitest";
import { formatPrice } from "../money";

describe("formatPrice", () => {
  it("renders whole BDT with no decimals", () => {
    expect(formatPrice(29900, "BDT")).toBe("BDT 299");
  });
  it("groups thousands", () => {
    expect(formatPrice(123456700, "BDT")).toBe("BDT 1,234,567");
  });
  it("keeps non-integer taka as decimals", () => {
    expect(formatPrice(29950, "BDT")).toBe("BDT 299.5");
  });
});
