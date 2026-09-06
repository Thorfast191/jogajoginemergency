"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tagCustomerUpdateSchema } from "@/lib/validations";
import { canSelectTheme } from "@/lib/themes";
import { userIsEntitled } from "@/lib/subscription";

export type TagUpdateState = { error?: string; success?: boolean };

export async function updateTagAction(
  tagId: string,
  _prevState: TagUpdateState,
  formData: FormData
): Promise<TagUpdateState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  // Ownership: the tag must belong to the authenticated customer.
  const tag = await prisma.tag.findFirst({ where: { id: tagId, userId: user.id } });
  if (!tag) return { error: "Tag not found." };

  const labelRaw = formData.get("internalLabel");
  const parsed = tagCustomerUpdateSchema.safeParse({
    internalLabel: labelRaw === "" ? null : labelRaw,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.tag.update({
    where: { id: tag.id },
    data: {
      internalLabel: parsed.data.internalLabel ?? null,
      status: parsed.data.status,
    },
  });

  revalidatePath(`/dashboard/tags/${tag.id}`);
  revalidatePath("/dashboard/tags");
  return { success: true };
}

/**
 * Re-skin a tag's scan page.
 *
 * Two gates, both server-side: the tag must belong to the caller, and a
 * PREMIUM theme requires a live subscription. The picker hides locked themes,
 * but the picker is not the enforcement.
 */
export async function setTagThemeAction(formData: FormData): Promise<void> {
  const user = await requireCustomer();

  const tagId = String(formData.get("tagId") ?? "");
  const themeIdRaw = String(formData.get("themeId") ?? "");
  const themeId = themeIdRaw === "" ? null : themeIdRaw;

  const tag = await prisma.tag.findFirst({ where: { id: tagId, userId: user.id } });
  if (!tag) return;

  if (themeId) {
    const theme = await prisma.theme.findFirst({
      where: { id: themeId, status: "ACTIVE" },
      select: { tier: true },
    });
    if (!theme) return;
    if (!canSelectTheme(theme, await userIsEntitled(user.id))) return;
  }

  await prisma.tag.update({ where: { id: tag.id }, data: { themeId } });
  revalidatePath(`/dashboard/tags/${tag.id}`);
}
