"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { slotBalanceForUser } from "@/lib/slots-server";
import { issueTagForUser } from "@/lib/tag-issue";

export type GenerateState = { error?: string };

/**
 * Generate a QR code against a slot the customer has bought.
 *
 * Codes are normally already there — paying for an order mints them (see
 * `issueOwedTags`). This stays for the cases that leaves open: a slot freed by
 * deleting a code, and an order whose automatic issue failed.
 *
 * The slot check and the tag creation run in one transaction and the balance is
 * re-read inside it, so two tabs submitting at once cannot both spend the last
 * slot — see src/lib/tag-issue.ts.
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

  const labelRaw = formData.get("internalLabel");
  const label = typeof labelRaw === "string" ? labelRaw : "";

  const result = await issueTagForUser(user.id, { internalLabel: label });

  if (!result.ok) {
    if (result.reason === "RACED") {
      return { error: "Another device was generating at the same moment. Please try again." };
    }
    const balance = await slotBalanceForUser(user.id);
    return {
      error:
        balance.owned === 0
          ? "Buy a sticker first — each one comes with a QR code you can generate here."
          : "You've used every QR code your stickers came with. Buy another to add more.",
    };
  }

  revalidatePath("/dashboard/tags");
  revalidatePath("/dashboard");
  redirect(`/dashboard/tags/${result.tagId}`);
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
