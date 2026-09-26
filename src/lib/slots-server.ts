import { prisma } from "@/lib/prisma";
import { slotBalance, type SlotBalance, type LineCapacity } from "@/lib/slots";

/**
 * How many QR codes this account has paid for, and how many it has used.
 *
 * Slots are counted from *paid* order lines only, so an abandoned or cancelled
 * order grants nothing. Deleting a tag frees its slot again. A replacement an
 * admin issued is not the customer's slot to pay for, so it never counts.
 */
export async function slotBalanceForUser(userId: string): Promise<SlotBalance> {
  const [lines, tagsCreated] = await Promise.all([
    prisma.orderItem.findMany({
      where: { order: { userId, status: "PAID" } },
      select: { quantity: true, product: { select: { qrSlots: true } } },
    }),
    prisma.tag.count({ where: { userId, isReplacement: false } }),
  ]);

  return slotBalance(
    lines.map((l) => ({ quantity: l.quantity, qrSlots: l.product.qrSlots })),
    tagsCreated,
  );
}

/**
 * Every paid order line for this account, oldest purchase first, with the
 * tags already generated against it counted.
 *
 * Feeds `nextOpenLine`, which decides the product, theme and provenance a
 * newly generated tag inherits. Replacements are left out for the same reason
 * as above: they did not spend a slot, so they must not make a line look full.
 */
export async function paidLineCapacities(userId: string): Promise<LineCapacity[]> {
  const lines = await prisma.orderItem.findMany({
    where: { order: { userId, status: "PAID" } },
    orderBy: [{ order: { placedAt: "asc" } }, { id: "asc" }],
    select: {
      id: true,
      quantity: true,
      productId: true,
      themeId: true,
      product: { select: { qrSlots: true, themeId: true } },
      tags: { select: { isReplacement: true } },
    },
  });

  return lines.map((l) => ({
    orderItemId: l.id,
    productId: l.productId,
    // The artwork the buyer picked at checkout, else the product's own — a
    // line bought before the shop offered the choice has none.
    themeId: l.themeId ?? l.product.themeId,
    quantity: l.quantity,
    qrSlots: l.product.qrSlots,
    tagsUsed: l.tags.filter((t) => !t.isReplacement).length,
  }));
}
