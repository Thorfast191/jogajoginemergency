"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { emergencyProfileSchema, emergencyContactSchema } from "@/lib/validations";
import { PRESET_FLAGS } from "@/lib/privacy";

const MAX_CONTACTS = 5;

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

// --- Emergency contacts ------------------------------------------------

export type ContactState = { error?: string; success?: boolean };

function parseContact(formData: FormData) {
  return emergencyContactSchema.safeParse({
    name: formData.get("name"),
    relation: formData.get("relation") || null,
    phone: formData.get("phone") || null,
    email: formData.get("email") || "",
    isPublic: formData.get("isPublic") === "on" || formData.get("isPublic") === "true",
  });
}

export async function addContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const profile = await ensureProfile(user.id);
  const existing = await prisma.emergencyContact.count({ where: { profileId: profile.id } });
  if (existing >= MAX_CONTACTS) {
    return { error: `You can have at most ${MAX_CONTACTS} emergency contacts.` };
  }

  const parsed = parseContact(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.emergencyContact.create({
    data: {
      profileId: profile.id,
      name: parsed.data.name,
      relation: parsed.data.relation ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      isPublic: parsed.data.isPublic,
      sortOrder: existing,
    },
  });

  revalidateProfileViews();
  return { success: true };
}

export async function updateContactAction(
  contactId: string,
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const owned = await prisma.emergencyContact.findFirst({
    where: { id: contactId, profile: { userId: user.id } },
    select: { id: true },
  });
  if (!owned) return { error: "Contact not found." };

  const parsed = parseContact(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.emergencyContact.update({
    where: { id: owned.id },
    data: {
      name: parsed.data.name,
      relation: parsed.data.relation ?? null,
      phone: parsed.data.phone ?? null,
      email: parsed.data.email || null,
      isPublic: parsed.data.isPublic,
    },
  });

  revalidateProfileViews();
  return { success: true };
}

export async function deleteContactAction(contactId: string) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return;
  }
  await prisma.emergencyContact.deleteMany({
    where: { id: contactId, profile: { userId: user.id } },
  });
  revalidateProfileViews();
}

export async function reorderContactsAction(orderedIds: string[]) {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return;
  }
  const owned = await prisma.emergencyContact.findMany({
    where: { id: { in: orderedIds }, profile: { userId: user.id } },
    select: { id: true },
  });
  const ownedSet = new Set(owned.map((c) => c.id));
  await prisma.$transaction(
    orderedIds
      .filter((id) => ownedSet.has(id))
      .map((id, index) =>
        prisma.emergencyContact.update({ where: { id }, data: { sortOrder: index } }),
      ),
  );
  revalidateProfileViews();
}
