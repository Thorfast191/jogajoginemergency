"use server";

import { revalidatePath } from "next/cache";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { orderStatusSchema, fulfillmentStatusSchema } from "@/lib/validations";
import { createTag } from "@/lib/tag";
import { audit } from "@/lib/audit";
import { orderReadiness } from "@/lib/print-server";
import { rateLimit } from "@/lib/rate-limit";
import { notifyQrGenerationNeeded } from "@/lib/notify";

const DAY_MS = 24 * 60 * 60 * 1000;

export type OrderActionState = { error?: string; ok?: boolean };

const ORDER_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

const FULFILLMENT_ORDER = ["UNFULFILLED", "PROCESSING", "SHIPPED", "DELIVERED"];

function revalidate(id: string) {
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin");
}

/**
 * Mark an order paid, cancelled or refunded by hand. Money changes hands (or
 * is said to), and marking an order paid grants QR slots — super admins only,
 * and always logged.
 */
export async function updateOrderStatusAction(
  id: string,
  status: string,
): Promise<OrderActionState> {
  const actor = await getStaffWith("money.manage");
  if (!actor) return { error: "Only a super admin can change an order's payment status." };
  const parsed = orderStatusSchema.safeParse({ status });
  if (!parsed.success) return { error: "Invalid status." };

  const order = await prisma.order.findUnique({
    where: { id },
    select: { status: true, orderNumber: true },
  });
  if (!order) return { error: "Order not found." };
  if (!ORDER_TRANSITIONS[order.status]?.includes(parsed.data.status)) {
    return { error: `Can't move an order from ${order.status} to ${parsed.data.status}.` };
  }

  await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status,
      ...(parsed.data.status === "PAID" ? { placedAt: new Date() } : {}),
    },
  });
  await audit(
    actor.id,
    "order.status",
    { type: "order", id },
    `Marked order ${order.orderNumber} ${parsed.data.status.toLowerCase()} (was ${order.status.toLowerCase()})`,
  );
  revalidate(id);
  return { ok: true };
}

export async function updateFulfillmentAction(
  id: string,
  status: string,
): Promise<OrderActionState> {
  if (!(await getStaffWith("orders.manage"))) return { error: "Not authorized." };
  const parsed = fulfillmentStatusSchema.safeParse({ status });
  if (!parsed.success) return { error: "Invalid status." };

  const order = await prisma.order.findUnique({
    where: { id },
    select: { fulfillmentStatus: true, status: true },
  });
  if (!order) return { error: "Order not found." };

  const from = FULFILLMENT_ORDER.indexOf(order.fulfillmentStatus);
  const to = FULFILLMENT_ORDER.indexOf(parsed.data.status);
  if (Math.abs(to - from) !== 1) {
    return { error: "Move fulfilment one step at a time." };
  }

  // Stickers are printed with the customer's QR in them, so an order cannot
  // go to the printer until it is paid and every QR on it exists.
  if (order.fulfillmentStatus === "UNFULFILLED" && parsed.data.status === "PROCESSING") {
    if (order.status !== "PAID") return { error: "Only a paid order can go to printing." };
    const readiness = await orderReadiness(id);
    if (!readiness.ready) {
      return {
        error: `Waiting for the customer to generate their QR codes (${readiness.generated} of ${readiness.needed} done).`,
      };
    }
  }

  await prisma.order.update({ where: { id }, data: { fulfillmentStatus: parsed.data.status } });
  revalidate(id);
  return { ok: true };
}

/**
 * Email the customer that their stickers are waiting on their QR codes.
 *
 * At most once a day per order, so a busy afternoon at the print desk doesn't
 * turn into a stream of the same email.
 */
export async function sendQrReminderAction(orderId: string): Promise<OrderActionState> {
  if (!(await getStaffWith("orders.manage"))) return { error: "Not authorized." };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true, userId: true, user: { select: { email: true } } },
  });
  if (!order) return { error: "Order not found." };
  if (order.status !== "PAID") return { error: "This order isn't paid yet." };

  const readiness = await orderReadiness(orderId);
  if (readiness.ready) return { error: "Every QR code on this order is already generated." };

  const { allowed } = await rateLimit(`qr-reminder:${orderId}`, { limit: 1, windowMs: DAY_MS });
  if (!allowed) return { error: "A reminder already went out for this order today." };

  await notifyQrGenerationNeeded({
    userId: order.userId,
    email: order.user.email,
    count: readiness.needed - readiness.generated,
  });
  return { ok: true };
}

/**
 * Support action: mint an extra QR for this order line without spending one of
 * the customer's slots. For replacing a sticker that arrived damaged or a code
 * that had to be taken down.
 */
export async function issueReplacementTagAction(orderItemId: string): Promise<OrderActionState> {
  if (!(await getStaffWith("orders.manage"))) return { error: "Not authorized." };

  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    select: {
      id: true,
      productId: true,
      orderId: true,
      product: { select: { themeId: true } },
      order: { select: { userId: true } },
    },
  });
  if (!item) return { error: "Order line not found." };

  await prisma.$transaction((tx) =>
    createTag(tx, {
      userId: item.order.userId,
      productId: item.productId,
      orderItemId: item.id,
      themeId: item.product.themeId,
    }),
  );

  revalidate(item.orderId);
  return { ok: true };
}
