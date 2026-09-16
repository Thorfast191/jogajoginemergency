"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStaffWith } from "@/lib/session";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { themeSchema, firstIssue } from "@/lib/validations";
import { canSaveTheme } from "@/lib/admin-guards";
import { DEFAULT_THEME_SLUG } from "@/lib/theme-access";
import { processThemeArt, MediaError } from "@/lib/media";
import { MAX_THEME_ART_BYTES, oversizeMessage } from "@/lib/upload-limits";
import { audit } from "@/lib/audit";

export type ThemeState = { error?: string; success?: boolean };

function parse(formData: FormData) {
  return themeSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    bgColor: formData.get("bgColor") || undefined,
    surfaceColor: formData.get("surfaceColor") || undefined,
    inkColor: formData.get("inkColor") || undefined,
    accentColor: formData.get("accentColor") || undefined,
    mascot: formData.get("mascot"),
    qrBoxSize: formData.get("qrBoxSize") || 40,
    status: formData.get("status"),
    sortOrder: formData.get("sortOrder") || 0,
  });
}

// A theme change alters both the storefront and every scan page using it.
function revalidate() {
  revalidatePath("/admin/themes");
  revalidatePath("/themes");
  revalidatePath("/shop");
}

export async function createThemeAction(
  _prev: ThemeState,
  formData: FormData,
): Promise<ThemeState> {
  if (!(await getStaffWith("catalog.edit"))) return { error: "Not authorized." };
  const parsed = parse(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const clash = await prisma.theme.findUnique({ where: { slug: parsed.data.slug } });
  if (clash) return { error: "A theme with that slug already exists." };

  await prisma.theme.create({ data: parsed.data });
  revalidate();
  redirect("/admin/themes");
}

export async function updateThemeAction(
  id: string,
  _prev: ThemeState,
  formData: FormData,
): Promise<ThemeState> {
  const actor = await getStaffWith("catalog.edit");
  if (!actor) return { error: "Not authorized." };
  const parsed = parse(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const existing = await prisma.theme.findUnique({ where: { id } });
  if (!existing) return { error: "Theme not found." };

  // Saving the form must not become a side door around the rules
  // archiveThemeAction enforces — see canSaveTheme.
  const guard = canSaveTheme({
    isDefault: existing.slug === DEFAULT_THEME_SLUG,
    mayArchive: can(actor.role, "destructive"),
    existingSlug: existing.slug,
    nextSlug: parsed.data.slug,
    existingStatus: existing.status,
    nextStatus: parsed.data.status,
  });
  if (!guard.ok) return { error: guard.reason };

  const clash = await prisma.theme.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
    select: { id: true },
  });
  if (clash) return { error: "Another theme already uses that slug." };

  await prisma.theme.update({ where: { id }, data: parsed.data });
  if (parsed.data.status !== existing.status) {
    await audit(
      actor.id,
      parsed.data.status === "ARCHIVED" ? "theme.archive" : "theme.status",
      { type: "theme", id },
      `${existing.name} theme: ${existing.status.toLowerCase()} → ${parsed.data.status.toLowerCase()}`,
    );
  }
  revalidate();
  return { success: true };
}

/**
 * Archiving hides a theme from the store and the picker. Tags already using it
 * keep their themeId and keep rendering — pulling a skin out from under an
 * existing sticker would change what a stranger sees with no warning.
 *
 * The default theme is exempt: it is what every account falls back to and what
 * a customer who bought no themed sticker gets, so archiving it would leave
 * those scan pages with no skin at all.
 */
export async function archiveThemeAction(id: string): Promise<ThemeState> {
  const actor = await getStaffWith("destructive");
  if (!actor) return { error: "Only a super admin can archive a theme." };

  const theme = await prisma.theme.findUnique({ where: { id }, select: { slug: true, name: true } });
  if (!theme) return { error: "Theme not found." };
  if (theme.slug === DEFAULT_THEME_SLUG) {
    return { error: "The default theme cannot be archived — every account falls back to it." };
  }

  await prisma.theme.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit(actor.id, "theme.archive", { type: "theme", id }, `Archived the ${theme.name} theme`);
  revalidate();
  return { success: true };
}

/**
 * Upload the artwork printed on a sticker in this theme. The design leaves an
 * empty square in its centre; the customer's QR is composited into it at the
 * theme's `qrBoxSize`.
 *
 * Kept at print quality (see processThemeArt). The old asset is deleted only
 * after the theme points at the new one, so a failure part-way leaves a theme
 * with working art rather than none.
 */
export async function uploadThemeArtAction(
  id: string,
  _prev: ThemeState,
  formData: FormData,
): Promise<ThemeState> {
  if (!(await getStaffWith("catalog.edit"))) return { error: "Not authorized." };

  const file = formData.get("art");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (file.size > MAX_THEME_ART_BYTES) return { error: oversizeMessage(MAX_THEME_ART_BYTES) };

  const theme = await prisma.theme.findUnique({ where: { id }, select: { artAssetId: true } });
  if (!theme) return { error: "Theme not found." };

  let processed;
  try {
    processed = await processThemeArt(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    return { error: e instanceof MediaError ? e.message : "Could not process that image." };
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      ownerId: null,
      kind: "THEME_ART",
      mimeType: processed.mimeType,
      byteSize: processed.byteSize,
      width: processed.width,
      height: processed.height,
      data: new Uint8Array(processed.data),
      checksum: processed.checksum,
    },
  });

  await prisma.theme.update({ where: { id }, data: { artAssetId: asset.id } });
  if (theme.artAssetId) {
    await prisma.mediaAsset.delete({ where: { id: theme.artAssetId } }).catch(() => {});
  }

  revalidate();
  revalidatePath(`/admin/themes/${id}`);
  return { success: true };
}
