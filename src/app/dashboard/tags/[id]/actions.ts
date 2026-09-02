"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { tagCustomerUpdateSchema } from "@/lib/validations";

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

  // Ownership: the tag must belong to the authenticated customer. Never trust
  // the tagId coming from the browser on its own.
  const tag = await prisma.tag.findFirst({ where: { id: tagId, userId: user.id } });
  if (!tag) return { error: "Tag not found." };

  const itemIdRaw = formData.get("itemId");
  const parsed = tagCustomerUpdateSchema.safeParse({
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

  // Ownership: the item being attached must also belong to this customer.
  if (parsed.data.itemId) {
    const item = await prisma.item.findFirst({
      where: { id: parsed.data.itemId, userId: user.id },
    });
    if (!item) return { error: "Item not found." };
  }

  await prisma.tag.update({
    where: { id: tag.id },
    data: {
      itemId: parsed.data.itemId ?? null,
      status: parsed.data.status,
      contactMode: parsed.data.contactMode,
      publicDisplayName: parsed.data.publicDisplayName,
      publicMessage: parsed.data.publicMessage,
      maskedPhone: parsed.data.maskedPhone,
    },
  });

  revalidatePath(`/dashboard/tags/${tag.id}`);
  revalidatePath("/dashboard/tags");
  return { success: true };
}
