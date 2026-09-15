import { describe, it, expect } from "vitest";
import { parseFeatures, planSchema, planTextSchema } from "../validations";

describe("parseFeatures", () => {
  it("takes one feature per line, trimmed, with blank lines dropped", () => {
    expect(parseFeatures("  Page goes live \n\n Medical details\r\n  Scan history  ")).toEqual([
      "Page goes live",
      "Medical details",
      "Scan history",
    ]);
  });
});

describe("planSchema", () => {
  const form = {
    slug: "plus",
    name: "Plus",
    priceCents: "49900",
    intervalMonths: "12",
    features: "Your page goes live\nScan history",
    isActive: "on",
  };

  it("reads a plan from form fields", () => {
    const r = planSchema.safeParse(form);
    expect(r.success).toBe(true);
    expect(r.success && r.data).toEqual({
      slug: "plus",
      name: "Plus",
      priceCents: 49900,
      intervalMonths: 12,
      features: ["Your page goes live", "Scan history"],
      isActive: true,
    });
  });

  it("treats an unticked checkbox as switched off", () => {
    // A browser leaves an unticked checkbox out of the form entirely.
    const r = planSchema.safeParse({ ...form, isActive: undefined });
    expect(r.success && r.data.isActive).toBe(false);
  });

  it("only allows monthly, six-monthly or yearly billing", () => {
    expect(planSchema.safeParse({ ...form, intervalMonths: "3" }).success).toBe(false);
    expect(planSchema.safeParse({ ...form, intervalMonths: "1" }).success).toBe(true);
    expect(planSchema.safeParse({ ...form, intervalMonths: "6" }).success).toBe(true);
  });

  it("refuses a negative price", () => {
    expect(planSchema.safeParse({ ...form, priceCents: "-1" }).success).toBe(false);
  });

  it("caps a plan at eight features", () => {
    const many = Array.from({ length: 9 }, (_, i) => `Feature ${i}`).join("\n");
    expect(planSchema.safeParse({ ...form, features: many }).success).toBe(false);
  });
});

describe("planTextSchema", () => {
  it("accepts just a name and features, for admins who can't set prices", () => {
    const r = planTextSchema.safeParse({ name: "Plus", features: "One\nTwo" });
    expect(r.success && r.data).toEqual({ name: "Plus", features: ["One", "Two"] });
  });
});
