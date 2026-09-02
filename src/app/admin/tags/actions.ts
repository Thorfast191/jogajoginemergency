"use server";

import { revalidatePath } from "next/cache";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { generateShortCode } from "@/lib/short-code";
import { generateClaimCode } from "@/lib/claim-code";
import { tagBatchSchema } from "@/lib/validations";

export type GenerateTagsState = {
  error?: string;
  created?: number;
};

// Platform QR tag inventory generation. Admin-only, role-based — not a customer
// entitlement, no subscription check. Records a TagBatch and bulk-inserts with
// createMany, retrying only the shortfall from unique collisions.
export async function generateTagBatchAction(input: {
  quantity: number;
  productId?: string | null;
  label: string;
}): Promise<GenerateTagsState> {
  const admin = await getAdmin();
  if (!admin) return { error: "Forbidden." };

  const parsed = tagBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { quantity, label } = parsed.data;
  const productId = parsed.data.productId || null;

  if (productId) {
    const product = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) return { error: "Product not found." };
  }

  const batch = await prisma.tagBatch.create({
    data: { label, productId, quantity, createdById: admin.id },
  });

  let created = 0;
  for (let round = 0; round < 4 && created < quantity; round++) {
    const need = quantity - created;
    const rows = Array.from({ length: need }, () => ({
      shortCode: generateShortCode(),
      claimCode: generateClaimCode(),
      productId,
      batchId: batch.id,
      status: "UNASSIGNED" as const,
    }));
    const res = await prisma.tag.createMany({ data: rows, skipDuplicates: true });
    created += res.count;
  }

  revalidatePath("/admin/tags");
  revalidatePath("/admin/tags/issued");
  revalidatePath("/admin");

  if (created < quantity) {
    return { error: `Only created ${created} of ${quantity} tags. Try again.`, created };
  }
  return { created };
}
