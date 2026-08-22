"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { itemSchema } from "@/lib/validations";

export type ItemFormState = { error?: string };

export async function createItemAction(
  _prevState: ItemFormState,
  formData: FormData
): Promise<ItemFormState> {
  const session = await auth();
  if (!session?.user) return { error: "Not authenticated." };

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
      userId: session.user.id,
      label: parsed.data.label,
      category: parsed.data.category,
      photoUrl: parsed.data.photoUrl || null,
    },
  });

  revalidatePath("/dashboard/items");
  return {};
}

export async function deleteItemAction(itemId: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.item.deleteMany({ where: { id: itemId, userId: session.user.id } });
  revalidatePath("/dashboard/items");
}
