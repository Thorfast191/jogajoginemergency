"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tagUpdateSchema } from "@/lib/validations";

export type TagUpdateState = { error?: string; success?: boolean };

export async function updateTagAction(
  tagId: string,
  _prevState: TagUpdateState,
  formData: FormData
): Promise<TagUpdateState> {
  const user = await requireActiveUser();
  if (!user) return { error: "Not authenticated." };

  const tag = await prisma.tag.findFirst({ where: { id: tagId, userId: user.id } });
  if (!tag) return { error: "Tag not found." };

  const itemIdRaw = formData.get("itemId");
  const parsed = tagUpdateSchema.safeParse({
    itemId: itemIdRaw === "" ? null : itemIdRaw,
    status: formData.get("status"),
    contactMode: formData.get("contactMode"),
    publicDisplayName: formData.get("publicDisplayName") || null,
    publicMessage: formData.get("publicMessage") || null,
    maskedPhone: formData.get("maskedPhone") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  if (parsed.data.itemId) {
    const item = await prisma.item.findFirst({
      where: { id: parsed.data.itemId, userId: user.id },
    });
    if (!item) return { error: "Item not found." };
  }

  await prisma.tag.update({
    where: { id: tagId },
    data: {
      itemId: parsed.data.itemId ?? null,
      status: parsed.data.status,
      contactMode: parsed.data.contactMode,
      publicDisplayName: parsed.data.publicDisplayName,
      publicMessage: parsed.data.publicMessage,
      maskedPhone: parsed.data.maskedPhone,
    },
  });

  revalidatePath(`/dashboard/tags/${tagId}`);
  revalidatePath("/dashboard/tags");
  return { success: true };
}
