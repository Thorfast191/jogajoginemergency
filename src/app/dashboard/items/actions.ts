"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { itemSchema } from "@/lib/validations";

export type ItemFormState = { error?: string };

export async function createItemAction(
  _prevState: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  const user = await requireActiveUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = itemSchema.safeParse({
    label: formData.get("label"),
    category: formData.get("category"),
    photoUrl: formData.get("photoUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  await prisma.item.create({
    data: {
      userId: user.id,
      label: parsed.data.label,
      category: parsed.data.category,
      photoUrl: parsed.data.photoUrl || null,
    },
  });

  revalidatePath("/dashboard/items");
  return {};
}

export async function updateItemAction(
  itemId: string,
  _prevState: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  const user = await requireActiveUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = itemSchema.safeParse({
    label: formData.get("label"),
    category: formData.get("category"),
    photoUrl: formData.get("photoUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await prisma.item.updateMany({
    where: { id: itemId, userId: user.id },
    data: {
      label: parsed.data.label,
      category: parsed.data.category,
      photoUrl: parsed.data.photoUrl || null,
    },
  });
  if (result.count === 0) return { error: "Item not found." };

  revalidatePath("/dashboard/items");
  return {};
}

export async function deleteItemAction(itemId: string) {
  const user = await requireActiveUser();
  if (!user) return;

  await prisma.item.deleteMany({ where: { id: itemId, userId: user.id } });
  revalidatePath("/dashboard/items");
}
