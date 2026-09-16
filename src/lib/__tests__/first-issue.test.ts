import { describe, it, expect } from "vitest";
import { z } from "zod";
import { firstIssue, emergencyProfileSchema, signupSchema } from "../validations";

const errorOf = (schema: z.ZodType, value: unknown) => {
  const r = schema.safeParse(value);
  if (r.success) throw new Error("expected a failure");
  return r.error;
};

describe("firstIssue — validation errors a person can act on", () => {
  it("names the field and says what's wrong, instead of zod's wording", () => {
    // What a customer used to read: "Too big: expected string to have <=20 characters".
    const e = errorOf(emergencyProfileSchema, { contactMode: "RELAY", phonePublic: "0".repeat(21) });
    expect(firstIssue(e)).toBe("Public phone number: must be 20 characters or fewer.");
  });

  it("keeps a message the schema wrote for people", () => {
    const e = errorOf(signupSchema, { name: "A", email: "a@b.co", password: "longenough" });
    expect(firstIssue(e)).toBe("Name is too short");
  });

  it("explains minimums, emails, choices and missing values", () => {
    const s = z.object({
      phone: z.string().min(6),
      email: z.email(),
      bloodGroup: z.enum(["A+", "B+"]),
      priceCents: z.coerce.number().int().min(0),
      label: z.string().min(1),
      url: z.string(),
    });
    const pick = (value: object) => firstIssue(errorOf(s, { phone: "123456", email: "a@b.co", bloodGroup: "A+", priceCents: 1, label: "x", url: "u", ...value }));
    expect(pick({ phone: "1" })).toBe("Phone: must be at least 6 characters.");
    expect(pick({ email: "nope" })).toBe("Email: must be a valid email address.");
    expect(pick({ bloodGroup: "Z" })).toBe("Blood group: isn't one of the allowed choices.");
    expect(pick({ priceCents: -1 })).toBe("Price: must be at least 0.");
    expect(pick({ label: "" })).toBe("Label: is required.");
    expect(pick({ url: undefined })).toBe("URL: is required.");
  });

  it("still says something for a field it has no label for", () => {
    const e = errorOf(z.object({ mystery: z.string().max(1) }), { mystery: "xx" });
    expect(firstIssue(e)).toBe("Must be 1 characters or fewer.");
  });
});
