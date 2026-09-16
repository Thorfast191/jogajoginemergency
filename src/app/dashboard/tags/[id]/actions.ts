"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tagCustomerUpdateSchema, firstIssue } from "@/lib/validations";
import { entitledThemeIdsForUser } from "@/lib/theme-access-server";
import { canUseTheme } from "@/lib/theme-access";
import { canSetTagStatus } from "@/lib/admin-guards";

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
    return { error: firstIssue(parsed.error) };
  }

  const next = parsed.data.status ?? tag.status;
  const verdict = canSetTagStatus({
    by: "owner",
    mayTakeDown: false,
    current: tag.status,
    takenDown: tag.takenDownAt !== null,
    next,
  });
  if (!verdict.ok) return { error: verdict.reason };

  await prisma.tag.update({
    where: { id: tag.id },
    data: {
      internalLabel: parsed.data.internalLabel ?? null,
      status: next,
    },
  });

  revalidatePath(`/dashboard/tags/${tag.id}`);
  revalidatePath("/dashboard/tags");
  return { success: true };
}

/**
 * Re-skin a tag's scan page.
 *
 * Two gates: the tag must belong to the caller, and the theme must be one they
 * paid for. A theme rides on the sticker product that carries it, so this is
 * what makes a themed sticker worth buying — the picker hides what you do not
 * own, and this refuses it if the form is posted by hand anyway.
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
      select: { id: true },
    });
    if (!theme) return;

    const entitled = await entitledThemeIdsForUser(user.id);
    if (!canUseTheme(themeId, entitled)) return;
  }

  await prisma.tag.update({ where: { id: tag.id }, data: { themeId } });
  revalidatePath(`/dashboard/tags/${tag.id}`);
}
