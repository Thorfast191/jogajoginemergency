"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { createTag } from "@/lib/tag";
import { slotBalanceForUser, paidLineCapacities } from "@/lib/slots-server";
import { canGenerateTag, nextOpenLine } from "@/lib/slots";
import { defaultTheme } from "@/lib/theme-access-server";

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

  // Charge the tag to the oldest paid line that still has an unused slot, so
  // it inherits that purchase's product, theme and provenance. Reading the
  // most recent line instead would hand a second Classic tag the theme of a
  // Night Guardian sticker whose slot was never spent.
  const line = nextOpenLine(await paidLineCapacities(user.id));

  // A sticker sold without a theme still gets the branded default rather than
  // an unstyled page.
  const fallbackTheme = line?.themeId ? null : await defaultTheme();

  let tagId = "";
  try {
    tagId = await prisma.$transaction(
      async (tx) => {
        const used = await tx.tag.count({ where: { userId: user.id, isReplacement: false } });
        if (used >= balance.owned) throw new Error("NO_SLOTS");

        const tag = await createTag(tx, {
          userId: user.id,
          productId: line?.productId ?? null,
          orderItemId: line?.orderItemId ?? null,
          themeId: line?.themeId ?? fallbackTheme?.id ?? null,
        });
        if (label) {
          await tx.tag.update({ where: { id: tag.id }, data: { internalLabel: label } });
        }
        return tag.id;
      },
      // Counting rows and then inserting one is only safe against a second tab
      // doing the same thing if the two are serialized: at READ COMMITTED both
      // transactions read the same count, both pass the check, and the account
      // ends up with more codes than it bought.
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    if (e instanceof Error && e.message === "NO_SLOTS") {
      return { error: "That slot was just used on another device." };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      return { error: "Another device was generating at the same moment. Please try again." };
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
