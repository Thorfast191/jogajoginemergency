import { prisma } from "@/lib/prisma";
import { printReadiness, type Readiness } from "@/lib/print";
import { notifyQrGenerationNeeded } from "@/lib/notify";

/**
 * Which tags on an order line count as printable.
 *
 * A deactivated code must never be printed and shipped — the print file at
 * /api/orders/[id]/stickers leaves it out — so it must not make the order look
 * ready either, or the parcel goes out a sticker short. A replacement an admin
 * issued is printed, but it stands in for a code the customer already made, so
 * it does not close a gap of its own.
 */
export const PRINTABLE_TAG = { status: { not: "DEACTIVATED" }, isReplacement: false } as const;

/** How close an order is to printable, straight from its lines and their tags. */
export async function orderReadiness(orderId: string): Promise<Readiness> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: {
      quantity: true,
      product: { select: { qrSlots: true } },
      _count: { select: { tags: { where: PRINTABLE_TAG } } },
    },
  });
  return printReadiness(
    items.map((i) => ({
      quantity: i.quantity,
      qrSlots: i.product.qrSlots,
      tagsGenerated: i._count.tags,
    })),
  );
}

/**
 * How many paid, unprinted orders are ready and how many are still waiting on
 * their customer.
 *
 * Counted in the database rather than by loading orders and adding up in
 * JavaScript, which silently under-reported once the backlog outgrew the page
 * size — the console's "needs attention" panel is exactly where a truncated
 * number is most misleading. Each line is capped at its own slots, so extra
 * codes on one line cannot cover a gap on another.
 */
export async function unfulfilledPrintQueue(): Promise<{ ready: number; waiting: number }> {
  const [row] = await prisma.$queryRaw<{ ready: number; waiting: number }[]>`
    SELECT
      COALESCE(SUM(CASE WHEN printable >= needed THEN 1 ELSE 0 END), 0)::int AS ready,
      COALESCE(SUM(CASE WHEN printable <  needed THEN 1 ELSE 0 END), 0)::int AS waiting
    FROM (
      SELECT
        o.id,
        COALESCE(SUM(oi.quantity * p."qrSlots"), 0) AS needed,
        COALESCE(SUM(LEAST(line.cnt, oi.quantity * p."qrSlots")), 0) AS printable
      FROM "Order" o
      JOIN "OrderItem" oi ON oi."orderId" = o.id
      JOIN "Product" p ON p.id = oi."productId"
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS cnt
        FROM "Tag" t
        WHERE t."orderItemId" = oi.id
          AND t.status <> 'DEACTIVATED'
          AND t."isReplacement" = false
      ) line ON TRUE
      WHERE o.status = 'PAID' AND o."fulfillmentStatus" = 'UNFULFILLED'
      GROUP BY o.id
    ) per_order
  `;
  return { ready: row?.ready ?? 0, waiting: row?.waiting ?? 0 };
}

/**
 * Right after an order is paid: tell the customer their stickers are waiting
 * on their QR codes. Nothing is sent if the order somehow needs none.
 */
export async function remindAboutNewOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, userId: true, user: { select: { email: true } } },
  });
  if (!order || order.status !== "PAID") return;

  const readiness = await orderReadiness(orderId);
  const missing = readiness.needed - readiness.generated;
  if (missing <= 0) return;

  await notifyQrGenerationNeeded({ userId: order.userId, email: order.user.email, count: missing });
}
