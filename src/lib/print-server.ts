import { prisma } from "@/lib/prisma";
import { printReadiness, type Readiness } from "@/lib/print";
import { notifyQrGenerationNeeded } from "@/lib/notify";

/** How close an order is to printable, straight from its lines and their tags. */
export async function orderReadiness(orderId: string): Promise<Readiness> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: {
      quantity: true,
      product: { select: { qrSlots: true } },
      _count: { select: { tags: true } },
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
