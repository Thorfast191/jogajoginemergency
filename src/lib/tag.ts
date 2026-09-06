import type { Prisma } from "@prisma/client";
import { generateShortCode } from "@/lib/short-code";

/**
 * Create a tag with a unique short code.
 *
 * The code is the only thing standing between a stranger and someone's
 * emergency page, so collisions are resolved by retrying against the unique
 * index rather than by checking first and hoping.
 *
 * This deliberately does NOT check QR slots — callers decide that. Customers
 * go through `generateTagAction`, which spends a slot; an admin issuing a
 * replacement bypasses the balance on purpose.
 */
export async function createTag(
  tx: Prisma.TransactionClient,
  data: { userId: string; productId?: string | null; orderItemId?: string | null; themeId?: string | null },
): Promise<{ id: string; shortCode: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortCode = generateShortCode();
    const clash = await tx.tag.findUnique({ where: { shortCode }, select: { id: true } });
    if (clash) continue;
    return tx.tag.create({
      data: {
        shortCode,
        userId: data.userId,
        productId: data.productId ?? null,
        orderItemId: data.orderItemId ?? null,
        themeId: data.themeId ?? null,
      },
      select: { id: true, shortCode: true },
    });
  }
  throw new Error("Could not allocate a unique tag code.");
}
