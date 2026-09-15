import { z } from "zod";
import { MASCOTS } from "@/lib/themes";

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

export const checkoutSchema = z.object({
  // Minted per rendered checkout form; Order.idempotencyKey is unique, so a
  // resubmit of the same form returns the original order.
  idempotencyKey: z.string().min(8).max(64),
  provider: z.enum(["DEMO", "SSLCOMMERZ", "BKASH", "NAGAD"]),
  shipName: z.string().max(200).optional().nullable(),
  shipPhone: z.string().max(200).optional().nullable(),
  shipAddress: z.string().max(200).optional().nullable(),
  shipCity: z.string().max(200).optional().nullable(),
  shipNote: z.string().max(200).optional().nullable(),
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
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export const orderStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "CANCELLED", "REFUNDED"]),
});

export const fulfillmentStatusSchema = z.object({
  status: z.enum(["UNFULFILLED", "PROCESSING", "SHIPPED", "DELIVERED"]),
});
