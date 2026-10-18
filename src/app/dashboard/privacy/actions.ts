"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { privacyFieldSchema, privacyPresetSchema } from "@/lib/validations";
import {
  applyPreset,
  CONSENT_VERSION,
  detectPreset,
  fieldNeedsConsent,
  FLAG_NAMES,
  needsConsent,
  type VisibilityFlags,
} from "@/lib/privacy";
import { ensureProfile } from "@/lib/profile";

export type PrivacyInput = (
  | { preset: "MINIMAL" | "STANDARD" | "FULL" }
  | { field: (typeof FLAG_NAMES)[number]; value: boolean }
) & {
  /** The owner ticked the consent statement (CONSENT_TEXT) for this change. */
  consent?: boolean;
};

export type PrivacyResult = { error?: string; ok?: boolean; needsConsent?: boolean };

const CONSENT_REQUIRED: PrivacyResult = {
  needsConsent: true,
  error: "Please confirm before publishing contacts, medical details or a phone number.",
};

export async function updatePrivacyAction(input: PrivacyInput): Promise<PrivacyResult> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const profile = await ensureProfile(user.id);
  // Consent is recorded once, with the wording's version, and covers later
  // changes. Making something private never needs it.
  const consented = profile.consentAt !== null || input.consent === true;
  const consentData =
    input.consent === true && profile.consentAt === null
      ? { consentAt: new Date(), consentVersion: CONSENT_VERSION }
      : {};

  if ("preset" in input) {
    const parsed = privacyPresetSchema.safeParse({ preset: input.preset });
    if (!parsed.success) return { error: "Invalid preset." };
    const flags = applyPreset(parsed.data.preset);
    if (needsConsent(flags, consented)) return CONSENT_REQUIRED;
    await prisma.emergencyProfile.update({
      where: { userId: user.id },
      data: { ...flags, visibilityPreset: detectPreset(flags), ...consentData },
    });
  } else {
    const parsed = privacyFieldSchema.safeParse({ field: input.field, value: input.value });
    if (!parsed.success) return { error: "Invalid field." };
    if (fieldNeedsConsent(parsed.data.field, parsed.data.value, consented)) return CONSENT_REQUIRED;
    // Write only the one flag, then derive the preset from the row as it now
    // stands. Reading every flag and writing them all back let two toggles
    // landing together undo each other — turning a field the owner had just
    // made private public again. The UPDATE's row lock serializes the two, and
    // the read inside the same transaction sees the other one's committed flag.
    await prisma.$transaction(async (tx) => {
      const row = await tx.emergencyProfile.update({
        where: { userId: user.id },
        data: { [parsed.data.field]: parsed.data.value, ...consentData },
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
 * Record consent for what is already public. For owners who published contacts
 * or medical details before consent was asked for: their page keeps working,
 * and the dashboard asks them to confirm.
 */
export async function confirmConsentAction(): Promise<PrivacyResult> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  await prisma.emergencyProfile.updateMany({
    where: { userId: user.id, consentAt: null },
    data: { consentAt: new Date(), consentVersion: CONSENT_VERSION },
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
