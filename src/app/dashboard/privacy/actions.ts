"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { privacyFieldSchema, privacyPresetSchema } from "@/lib/validations";
import {
  applyPreset,
  detectPreset,
  FLAG_NAMES,
  type VisibilityFlags,
} from "@/lib/privacy";
import { ensureProfile } from "@/app/dashboard/profile/actions";

export type PrivacyInput =
  | { preset: "MINIMAL" | "STANDARD" | "FULL" }
  | { field: (typeof FLAG_NAMES)[number]; value: boolean };

export async function updatePrivacyAction(
  input: PrivacyInput,
): Promise<{ error?: string; ok?: boolean }> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const profile = await ensureProfile(user.id);

  let flags: VisibilityFlags;
  if ("preset" in input) {
    const parsed = privacyPresetSchema.safeParse(input);
    if (!parsed.success) return { error: "Invalid preset." };
    flags = applyPreset(parsed.data.preset);
  } else {
    const parsed = privacyFieldSchema.safeParse(input);
    if (!parsed.success) return { error: "Invalid field." };
    const current = Object.fromEntries(
      FLAG_NAMES.map((k) => [k, profile[k]]),
    ) as unknown as VisibilityFlags;
    flags = { ...current, [parsed.data.field]: parsed.data.value };
  }

  await prisma.emergencyProfile.update({
    where: { userId: user.id },
    data: { ...flags, visibilityPreset: detectPreset(flags) },
  });

  revalidatePath("/dashboard/privacy");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Portfolio visibility (bio, links).
 *
 * Deliberately outside the preset system: presets describe how much emergency
 * information you publish, and folding two optional-extra switches into them
 * would change what MINIMAL/STANDARD/FULL mean.
 */
export async function updatePortfolioVisibilityAction(input: {
  field: "bioPublic" | "linksPublic";
  value: boolean;
}): Promise<{ error?: string; ok?: boolean }> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  if (input.field !== "bioPublic" && input.field !== "linksPublic") {
    return { error: "Invalid field." };
  }

  await ensureProfile(user.id);
  await prisma.emergencyProfile.update({
    where: { userId: user.id },
    data: { [input.field]: Boolean(input.value) },
  });

  revalidatePath("/dashboard/privacy");
  return { ok: true };
}
