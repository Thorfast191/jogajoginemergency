import { prisma } from "@/lib/prisma";
import { slotBalance, type SlotBalance } from "@/lib/slots";

/**
 * How many QR codes this account has paid for, and how many it has used.
 *
 * Slots are counted from *paid* order lines only, so an abandoned or cancelled
 * order grants nothing. Deleting a tag frees its slot again.
 */
export async function slotBalanceForUser(userId: string): Promise<SlotBalance> {
  const [lines, tagsCreated] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { userId, status: "PAID" } },
      select: { quantity: true, product: { select: { qrSlots: true } } },
    }),
    prisma.tag.count({ where: { userId } }),
  ]);

  return slotBalance(
    lines.map((l) => ({ quantity: l.quantity, qrSlots: l.product.qrSlots })),
    tagsCreated,
  );
}
