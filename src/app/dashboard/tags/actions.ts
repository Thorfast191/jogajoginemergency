"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createTag } from "@/lib/tag";
import { slotBalanceForUser } from "@/lib/slots-server";
import { canGenerateTag } from "@/lib/slots";

export type GenerateState = { error?: string };

/**
 * Generate a QR code against a slot the customer has bought.
 *
 * The slot check and the tag creation run in one transaction and the balance is
 * re-read inside it, so two tabs submitting at once cannot both spend the last
 * slot.
 */
export async function generateTagAction(
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const balance = await slotBalanceForUser(user.id);
  if (!canGenerateTag(balance)) {
    return {
      error:
        balance.owned === 0
          ? "Buy a sticker first — each one comes with a QR code you can generate here."
          : "You've used every QR code your stickers came with. Buy another to add more.",
    };
  }

  const labelRaw = formData.get("internalLabel");
  const label = typeof labelRaw === "string" ? labelRaw.trim().slice(0, 100) : "";

  // Pick the most recent paid line that still has an unused slot, so the new
  // tag inherits the right product and its theme.
  const line = await prisma.orderItem.findFirst({
    where: { order: { userId: user.id, status: "PAID" } },
    orderBy: { order: { placedAt: "desc" } },
    select: { id: true, productId: true, product: { select: { themeId: true } } },
  });

  let tagId = "";
  try {
    tagId = await prisma.$transaction(async (tx) => {
      const used = await tx.tag.count({ where: { userId: user.id } });
      if (used >= balance.owned) throw new Error("NO_SLOTS");

      const tag = await createTag(tx, {
        userId: user.id,
        productId: line?.productId ?? null,
        orderItemId: line?.id ?? null,
        themeId: line?.product.themeId ?? null,
      });
      if (label) {
        await tx.tag.update({ where: { id: tag.id }, data: { internalLabel: label } });
      }
      return tag.id;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NO_SLOTS") {
      return { error: "That slot was just used on another device." };
    }
    throw e;
  }

  revalidatePath("/dashboard/tags");
  revalidatePath("/dashboard");
  redirect(`/dashboard/tags/${tagId}`);
}

/** Delete a tag, freeing its slot. The QR stops resolving immediately. */
export async function deleteTagAction(formData: FormData): Promise<void> {
  const user = await requireCustomer();
  const tagId = String(formData.get("tagId") ?? "");

  // Scoped by owner so one customer can never delete another's tag.
  await prisma.tag.deleteMany({ where: { id: tagId, userId: user.id } });

  revalidatePath("/dashboard/tags");
  revalidatePath("/dashboard");
  redirect("/dashboard/tags");
}
