"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { orderStatusSchema, fulfillmentStatusSchema } from "@/lib/validations";
import { createTag } from "@/lib/tag";

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

export async function updateOrderStatusAction(
  id: string,
  status: string,
): Promise<OrderActionState> {
  await requireAdmin();
  const parsed = orderStatusSchema.safeParse({ status });
  if (!parsed.success) return { error: "Invalid status." };

  const order = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  if (!order) return { error: "Order not found." };
  if (!ORDER_TRANSITIONS[order.status]?.includes(parsed.data.status)) {
    return { error: `Can't move an order from ${order.status} to ${parsed.data.status}.` };
  }

  await prisma.order.update({ where: { id }, data: { status: parsed.data.status } });
  revalidate(id);
  return { ok: true };
}

export async function updateFulfillmentAction(
  id: string,
  status: string,
): Promise<OrderActionState> {
  await requireAdmin();
  const parsed = fulfillmentStatusSchema.safeParse({ status });
  if (!parsed.success) return { error: "Invalid status." };

  const order = await prisma.order.findUnique({
    where: { id },
    select: { fulfillmentStatus: true },
  });
  if (!order) return { error: "Order not found." };

  const from = FULFILLMENT_ORDER.indexOf(order.fulfillmentStatus);
  const to = FULFILLMENT_ORDER.indexOf(parsed.data.status);
  if (Math.abs(to - from) !== 1) {
    return { error: "Move fulfilment one step at a time." };
  }

  await prisma.order.update({ where: { id }, data: { fulfillmentStatus: parsed.data.status } });
  revalidate(id);
  return { ok: true };
}

/**
 * Support action: mint an extra QR for this order line without spending one of
 * the customer's slots. For replacing a sticker that arrived damaged or a code
 * that had to be taken down.
 */
export async function issueReplacementTagAction(orderItemId: string): Promise<OrderActionState> {
  await requireAdmin();

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
