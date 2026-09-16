"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { emergencyProfileSchema, emergencyContactSchema, profileLinkSchema, bioSchema, firstIssue } from "@/lib/validations";
import { PRESET_FLAGS } from "@/lib/privacy";
import { processImage, MediaError } from "@/lib/media";
import { ensureProfile } from "@/lib/profile";
import { MAX_IMAGE_BYTES, oversizeMessage } from "@/lib/upload-limits";

const MAX_CONTACTS = 5;

export type ProfileState = { error?: string; success?: boolean };

function revalidateProfileViews() {
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/privacy");
  revalidatePath("/dashboard");
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
    return { error: firstIssue(parsed.error) };
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
  if (!parsed.success) return { error: firstIssue(parsed.error) };

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
  if (!parsed.success) return { error: firstIssue(parsed.error) };

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

// --- Profile photo ---------------------------------------------------

export type PhotoState = { error?: string; success?: boolean };


export async function uploadProfilePhotoAction(
  _prev: PhotoState,
  formData: FormData,
): Promise<PhotoState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image to upload." };
  if (file.size > MAX_IMAGE_BYTES) return { error: oversizeMessage(MAX_IMAGE_BYTES) };

  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()), "PROFILE_PHOTO");
  } catch (e) {
    return { error: e instanceof MediaError ? e.message : "Could not process that image." };
  }

  const profile = await ensureProfile(user.id);
  const previousAssetId = profile.photoAssetId;

  const asset = await prisma.mediaAsset.create({
    data: {
      ownerId: user.id,
      kind: "PROFILE_PHOTO",
      mimeType: processed.mimeType,
      byteSize: processed.byteSize,
      width: processed.width,
      height: processed.height,
      data: new Uint8Array(processed.data),
      checksum: processed.checksum,
    },
  });

  await prisma.emergencyProfile.update({
    where: { userId: user.id },
    data: { photoAssetId: asset.id },
  });

  if (previousAssetId) {
    await prisma.mediaAsset.delete({ where: { id: previousAssetId } }).catch(() => {});
  }

  revalidateProfileViews();
  return { success: true };
}

export async function deleteProfilePhotoAction(): Promise<PhotoState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const profile = await prisma.emergencyProfile.findUnique({ where: { userId: user.id } });
  if (!profile?.photoAssetId) return { success: true };

  await prisma.emergencyProfile.update({
    where: { userId: user.id },
    data: { photoAssetId: null },
  });
  await prisma.mediaAsset.delete({ where: { id: profile.photoAssetId } }).catch(() => {});

  revalidateProfileViews();
  return { success: true };
}

// --- Portfolio (Plus) ------------------------------------------------------
// Bio and links only ever reach the scan page through buildPublicProfileView,
// which drops them entirely when the subscription has lapsed. Editing them
// while unsubscribed is allowed on purpose: the data is the owner's, it simply
// isn't published until they subscribe again.

export type LinkState = { error?: string; success?: boolean };

const MAX_LINKS = 6;

export async function updateBioAction(
  _prev: LinkState,
  formData: FormData,
): Promise<LinkState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const parsed = bioSchema.safeParse({ bio: formData.get("bio") || null });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const profile = await ensureProfile(user.id);
  await prisma.emergencyProfile.update({
    where: { id: profile.id },
    data: { bio: parsed.data.bio?.trim() || null },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/privacy");
  return { success: true };
}

function parseLink(formData: FormData) {
  return profileLinkSchema.safeParse({
    label: formData.get("label"),
    url: formData.get("url"),
    isPublic: formData.get("isPublic") === "on",
  });
}

export async function addLinkAction(_prev: LinkState, formData: FormData): Promise<LinkState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const profile = await ensureProfile(user.id);
  const count = await prisma.profileLink.count({ where: { profileId: profile.id } });
  if (count >= MAX_LINKS) return { error: `You can add up to ${MAX_LINKS} links.` };

  const parsed = parseLink(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  await prisma.profileLink.create({
    data: {
      profileId: profile.id,
      label: parsed.data.label,
      url: parsed.data.url.trim(),
      isPublic: parsed.data.isPublic,
      sortOrder: count,
    },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/privacy");
  return { success: true };
}

export async function deleteLinkAction(linkId: string) {
  const user = await requireCustomer();

  // Scoped through the profile so one customer cannot delete another's link.
  await prisma.profileLink.deleteMany({
    where: { id: linkId, profile: { userId: user.id } },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/privacy");
}
