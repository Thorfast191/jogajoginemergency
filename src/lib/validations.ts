import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name is too short").max(100),
  email: z.string().email(),
  phone: z.string().min(6).max(20).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
  planSlug: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const itemSchema = z.object({
  label: z.string().min(2).max(100),
  category: z.string().min(1).max(50),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

export const tagUpdateSchema = z.object({
  itemId: z.string().optional().nullable(),
  status: z.enum(["UNASSIGNED", "ACTIVE", "LOST", "DEACTIVATED"]).optional(),
  contactMode: z.enum(["RELAY", "MASKED_PHONE"]).optional(),
  publicDisplayName: z.string().max(100).optional().nullable(),
  publicMessage: z.string().max(500).optional().nullable(),
  maskedPhone: z.string().max(20).optional().nullable(),
});

export const relayMessageSchema = z.object({
  finderContact: z.string().min(3).max(200),
  message: z.string().min(1).max(1000),
});

export const abuseReportSchema = z.object({
  tagId: z.string().optional(),
  reason: z.string().min(2).max(100),
  details: z.string().max(1000).optional(),
});
