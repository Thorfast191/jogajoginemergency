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
import { ensureProfile } from "@/lib/profile";

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

  await ensureProfile(user.id);

  if ("preset" in input) {
    const parsed = privacyPresetSchema.safeParse(input);
    if (!parsed.success) return { error: "Invalid preset." };
    const flags = applyPreset(parsed.data.preset);
    await prisma.emergencyProfile.update({
      where: { userId: user.id },
      data: { ...flags, visibilityPreset: detectPreset(flags) },
    });
  } else {
    const parsed = privacyFieldSchema.safeParse(input);
    if (!parsed.success) return { error: "Invalid field." };
    // Write only the one flag, then derive the preset from the row as it now
    // stands. Reading every flag and writing them all back let two toggles
    // landing together undo each other — turning a field the owner had just
    // made private public again. The UPDATE's row lock serializes the two, and
    // the read inside the same transaction sees the other one's committed flag.
    await prisma.$transaction(async (tx) => {
      const row = await tx.emergencyProfile.update({
        where: { userId: user.id },
        data: { [parsed.data.field]: parsed.data.value },
      });
      const flags = Object.fromEntries(FLAG_NAMES.map((k) => [k, row[k]])) as unknown as VisibilityFlags;
      await tx.emergencyProfile.update({
        where: { userId: user.id },
        data: { visibilityPreset: detectPreset(flags) },
      });
    });
  }

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
