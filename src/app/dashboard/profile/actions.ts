"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { emergencyProfileSchema } from "@/lib/validations";
import { PRESET_FLAGS } from "@/lib/privacy";

export type ProfileState = { error?: string; success?: boolean };

function revalidateProfileViews() {
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/privacy");
  revalidatePath("/dashboard");
}

/** Load the caller's profile, creating a STANDARD-visibility row on first use. */
export async function ensureProfile(userId: string) {
  return prisma.emergencyProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, visibilityPreset: "STANDARD", ...PRESET_FLAGS.STANDARD },
  });
}

export async function updateEmergencyProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const parsed = emergencyProfileSchema.safeParse({
    displayName: formData.get("displayName") || null,
    emergencyMessage: formData.get("emergencyMessage") || null,
    bloodGroup: formData.get("bloodGroup") || null,
    allergies: formData.get("allergies") || null,
    medicalNotes: formData.get("medicalNotes") || null,
    contactMode: formData.get("contactMode"),
    phonePublic: formData.get("phonePublic") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;
  await prisma.emergencyProfile.upsert({
    where: { userId: user.id },
    update: {
      displayName: d.displayName ?? null,
      emergencyMessage: d.emergencyMessage ?? null,
      bloodGroup: d.bloodGroup || null,
      allergies: d.allergies ?? null,
      medicalNotes: d.medicalNotes ?? null,
      contactMode: d.contactMode,
      phonePublic: d.phonePublic ?? null,
    },
    create: {
      userId: user.id,
      visibilityPreset: "STANDARD",
      ...PRESET_FLAGS.STANDARD,
      displayName: d.displayName ?? null,
      emergencyMessage: d.emergencyMessage ?? null,
      bloodGroup: d.bloodGroup || null,
      allergies: d.allergies ?? null,
      medicalNotes: d.medicalNotes ?? null,
      contactMode: d.contactMode,
      phonePublic: d.phonePublic ?? null,
    },
  });

  revalidateProfileViews();
  return { success: true };
}
