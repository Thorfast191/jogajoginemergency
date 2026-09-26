import { z } from "zod";
import { MASCOTS } from "@/lib/themes";
import { BILLING_INTERVALS } from "@/lib/subscription-periods";

// --- Auth --------------------------------------------------------------

export const signupSchema = z.object({
  name: z.string().min(2, "Name is too short").max(100),
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  phone: z.string().min(6).max(20).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1),
});

// --- Customer tag management ----------------------------------------
// Customers set an optional private nickname and flip status between the
// owner-controlled states.

export const tagCustomerUpdateSchema = z.object({
  internalLabel: z.string().max(100).optional().nullable(),
  status: z.enum(["ACTIVE", "LOST", "DEACTIVATED"]).optional(),
});

// --- Finder-facing --------------------------------------------------

export const relayMessageSchema = z.object({
  finderContact: z.string().min(3).max(200),
  message: z.string().min(1).max(1000),
});

export const abuseReportSchema = z.object({
  shortCode: z.string().optional(),
  reason: z.string().min(2).max(100),
  details: z.string().max(1000).optional(),
});

// --- Emergency profile --------------------------------------------

const BLOOD_GROUPS = ["", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const emergencyProfileSchema = z
  .object({
    displayName: z.string().max(100).optional().nullable(),
    emergencyMessage: z.string().max(500).optional().nullable(),
    bloodGroup: z.enum(BLOOD_GROUPS).optional().nullable(),
    allergies: z.string().max(500).optional().nullable(),
    medicalNotes: z.string().max(500).optional().nullable(),
    contactMode: z.enum(["RELAY", "DIRECT_CALL"]),
    phonePublic: z.string().max(20).optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.contactMode === "DIRECT_CALL" && !val.phonePublic?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["phonePublic"],
        message: "A public phone number is required for click-to-call.",
      });
    }
  });

// Portfolio links are rendered as href on the public scan page, so the scheme
// is restricted here as well as in the DTO. Two gates, because this one gives
// the owner a useful error and the DTO one is the guarantee.
export const profileLinkSchema = z.object({
  label: z.string().min(1, "Give the link a label").max(40),
  url: z
    .string()
    .min(1, "Enter a URL")
    .max(500)
    .refine(
      (v) => {
        try {
          return ["http:", "https:"].includes(new URL(v.trim()).protocol);
        } catch {
          return false;
        }
      },
      { message: "Enter a full http:// or https:// address" },
    ),
  isPublic: z.boolean(),
});

export const bioSchema = z.object({
  bio: z.string().max(280).optional().nullable(),
});

export const emergencyContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(80),
  relation: z.string().max(40).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  isPublic: z.boolean(),
});

// --- Privacy -----------------------------------------------------

export const PRIVACY_FIELD_NAMES = [
  "photoPublic",
  "namePublic",
  "messagePublic",
  "bloodGroupPublic",
  "allergiesPublic",
  "medicalNotesPublic",
  "contactsPublic",
  "showPhone",
] as const;

export const privacyFieldSchema = z.object({
  field: z.enum(PRIVACY_FIELD_NAMES),
  value: z.boolean(),
});

export const privacyPresetSchema = z.object({
  preset: z.enum(["MINIMAL", "STANDARD", "FULL"]),
});

// --- Store: checkout ----------------------------------------------

// Where a parcel goes. Shared by checkout and by the two places an address can
// be corrected afterwards — the customer's own order page while it is still
// unshipped, and the console.
export const shippingFields = {
  shipName: z.string().max(200).optional().nullable(),
  shipPhone: z.string().max(200).optional().nullable(),
  shipAddress: z.string().max(200).optional().nullable(),
  shipCity: z.string().max(200).optional().nullable(),
  shipNote: z.string().max(200).optional().nullable(),
};

export const shippingSchema = z.object(shippingFields);

export const checkoutSchema = z.object({
  // Minted per rendered checkout form; Order.idempotencyKey is unique, so a
  // resubmit of the same form returns the original order.
  idempotencyKey: z.string().min(8).max(64),
  provider: z.enum(["DEMO", "SSLCOMMERZ", "BKASH", "NAGAD"]),
  ...shippingFields,
});

// --- Admin: products & orders -------------------------------------

export const productSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and hyphens only"),
  name: z.string().min(2).max(80),
  tagline: z.string().min(2).max(140),
  description: z.string().min(2).max(2000),
  useCase: z.string().max(500).optional().nullable(),
  priceCents: z.coerce.number().int().min(0),
  currency: z.string().min(1).max(8).default("BDT"),
  // How many QR codes one of these entitles the buyer to generate. Capped
  // because it is the only thing standing between a purchase and unlimited
  // tags, and a typo here is a hole rather than a cosmetic mistake.
  qrSlots: z.coerce.number().int().min(1).max(100),
  // Printed width of the sticker; sizes the real-size print PDF.
  stickerWidthMm: z.coerce
    .number()
    .int()
    .min(20, "Stickers are at least 20 mm wide")
    .max(300, "Stickers are at most 300 mm wide"),
  themeId: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const hexColor = (fallback: string) =>
  z
    .string()
    .trim()
    .regex(HEX_COLOR, "Use a hex colour like #1A2B3C")
    .default(fallback);

export const themeSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and hyphens only"),
  name: z.string().min(2).max(60),
  tagline: z.string().min(2).max(140),
  bgColor: hexColor("#FBF9F6"),
  surfaceColor: hexColor("#FFFFFF"),
  inkColor: hexColor("#171717"),
  accentColor: hexColor("#059669"),
  mascot: z.enum(MASCOTS),
  // The empty centre square the customer's QR is printed into, as a
  // percentage of the artwork's shorter edge. See src/lib/sticker-layout.ts.
  qrBoxSize: z.coerce
    .number()
    .int()
    .min(20, "The QR square must be at least 20% of the artwork")
    .max(80, "The QR square can be at most 80% of the artwork"),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

// --- Admin: subscription plans ------------------------------------

/** One feature per line of a textarea, trimmed, blank lines dropped. */
export function parseFeatures(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

const featuresField = z.preprocess(
  (v) => (typeof v === "string" ? parseFeatures(v) : v),
  z.array(z.string().min(1).max(120)).max(8, "A plan can list at most 8 features"),
);

// A browser leaves an unticked checkbox out of the form, and sends "on" for a
// ticked one.
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** What any admin may change about a plan: its words. */
export const planTextSchema = z.object({
  name: z.string().trim().min(2).max(60),
  features: featuresField,
});

/** The whole plan, for a super admin: its words, its price and its billing period. */
export const planSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, digits and hyphens only"),
  name: z.string().trim().min(2).max(60),
  priceCents: z.coerce.number().int().min(0, "A price can't be negative"),
  intervalMonths: z.coerce
    .number()
    .int()
    .refine((n) => (BILLING_INTERVALS as readonly number[]).includes(n), {
      message: "Billing is monthly, every 6 months, or yearly",
    }),
  features: featuresField,
  isActive: checkbox,
});

// --- Admin: platform settings -------------------------------------

const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const optionalText = (max: number) =>
  z.preprocess(blankToNull, z.string().trim().max(max).nullable());

const optionalHttpUrl = z.preprocess(
  blankToNull,
  z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => {
        try {
          return ["http:", "https:"].includes(new URL(v).protocol);
        } catch {
          return false;
        }
      },
      { message: "Enter a full http:// or https:// address" },
    )
    .nullable(),
);

export const settingsSchema = z.object({
  supportEmail: z.preprocess(blankToNull, z.email("Enter a valid support email").nullable()),
  supportPhone: optionalText(40),
  address: optionalText(200),
  facebookUrl: optionalHttpUrl,
  whatsappUrl: optionalHttpUrl,
  announcement: optionalText(200),
  ordersPaused: checkbox,
  ordersPausedMessage: optionalText(200),
});

export const orderStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "CANCELLED", "REFUNDED"]),
});

export const fulfillmentStatusSchema = z.object({
  status: z.enum(["UNFULFILLED", "PROCESSING", "SHIPPED", "DELIVERED"]),
});

// --- Error messages ---------------------------------------------------

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  password: "Password",
  currentPassword: "Current password",
  newPassword: "New password",
  displayName: "Display name",
  emergencyMessage: "Emergency message",
  bloodGroup: "Blood group",
  allergies: "Allergies",
  medicalNotes: "Medical notes",
  phonePublic: "Public phone number",
  relation: "Relationship",
  label: "Label",
  url: "URL",
  bio: "Bio",
  internalLabel: "Label",
  shipName: "Shipping name",
  shipPhone: "Shipping phone",
  shipAddress: "Address",
  shipCity: "City",
  shipNote: "Delivery note",
  finderContact: "Your phone or email",
  message: "Message",
  reason: "Reason",
  details: "Details",
  slug: "Slug",
  tagline: "Tagline",
  description: "Description",
  useCase: "Use case",
  priceCents: "Price",
  currency: "Currency",
  qrSlots: "QR slots",
  stickerWidthMm: "Sticker width",
  sortOrder: "Sort order",
};

// zod's own wording ("Too big: expected string to have <=20 characters") is
// for developers. Anything else was written into a schema for people.
const ZOD_DEFAULT = /^(Too big|Too small|Invalid input|Invalid option|Invalid email address|Invalid string)/;

function plainWords(issue: z.core.$ZodIssue): string {
  const i = issue as z.core.$ZodIssue & { origin?: string; minimum?: number | bigint; maximum?: number | bigint; format?: string };
  const text = i.origin === "string" || i.origin === undefined;
  switch (i.code) {
    case "too_big":
      return text ? `must be ${i.maximum} characters or fewer` : `must be at most ${i.maximum}`;
    case "too_small":
      if (text) return Number(i.minimum) <= 1 ? "is required" : `must be at least ${i.minimum} characters`;
      return `must be at least ${i.minimum}`;
    case "invalid_format":
      return i.format === "email" ? "must be a valid email address" : "isn't in the right format";
    case "invalid_value":
      return "isn't one of the allowed choices";
    case "invalid_type":
      return "is required";
    default:
      return "is invalid";
  }
}

/**
 * The first validation problem, as a sentence for the person who typed it:
 * "Public phone number: must be 20 characters or fewer."
 */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  if (!ZOD_DEFAULT.test(issue.message)) return issue.message;
  const words = plainWords(issue);
  const field = FIELD_LABELS[String(issue.path[0] ?? "")];
  return field ? `${field}: ${words}.` : `${words[0].toUpperCase()}${words.slice(1)}.`;
}
