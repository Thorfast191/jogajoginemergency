"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { themeSchema } from "@/lib/validations";

export type ThemeState = { error?: string; success?: boolean };

function parse(formData: FormData) {
  return themeSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    tier: formData.get("tier"),
    bgColor: formData.get("bgColor") || undefined,
    surfaceColor: formData.get("surfaceColor") || undefined,
    inkColor: formData.get("inkColor") || undefined,
    accentColor: formData.get("accentColor") || undefined,
    mascot: formData.get("mascot"),
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
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

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
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const clash = await prisma.theme.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
    select: { id: true },
  });
  if (clash) return { error: "Another theme already uses that slug." };

  await prisma.theme.update({ where: { id }, data: parsed.data });
  revalidate();
  return { success: true };
}

/**
 * Archiving hides a theme from the store and the picker. Tags already using it
 * keep their themeId and keep rendering — pulling a skin out from under an
 * existing sticker would change what a stranger sees with no warning.
 */
export async function archiveThemeAction(id: string): Promise<void> {
  await requireAdmin();
  await prisma.theme.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidate();
}
