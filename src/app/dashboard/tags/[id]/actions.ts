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
