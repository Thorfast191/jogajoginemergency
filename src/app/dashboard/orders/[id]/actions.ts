"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { shippingSchema, firstIssue } from "@/lib/validations";
import { canEditShipping } from "@/lib/order";

export type ShippingState = { error?: string; ok?: boolean };

/**
 * Fix your own delivery address.
 *
 * Allowed until the parcel ships, and refused after — changing the address on
 * something already in a courier's hands would show the customer a destination
 * the parcel is not going to. The window is deliberately generous: a sticker
 * cannot be printed until its QR exists, so most orders sit unshipped for a
 * while, which is exactly when a typo gets noticed.
 *
 * Scoped by owner, so this can only ever reach the caller's own order.
 */
export async function updateMyShippingAction(
  orderId: string,
  _prev: ShippingState,
  formData: FormData,
): Promise<ShippingState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const parsed = shippingSchema.safeParse({
    shipName: formData.get("shipName") || null,
    shipPhone: formData.get("shipPhone") || null,
    shipAddress: formData.get("shipAddress") || null,
    shipCity: formData.get("shipCity") || null,
    shipNote: formData.get("shipNote") || null,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true, status: true, fulfillmentStatus: true },
  });
  if (!order) return { error: "Order not found." };
  if (!canEditShipping(order)) {
    return {
      error:
        order.status === "CANCELLED" || order.status === "REFUNDED"
          ? "This order is closed, so its address can't be changed."
          : "This order has already shipped. Contact us and we'll help track it down.",
    };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      shipName: parsed.data.shipName?.trim() || null,
      shipPhone: parsed.data.shipPhone?.trim() || null,
      shipAddress: parsed.data.shipAddress?.trim() || null,
      shipCity: parsed.data.shipCity?.trim() || null,
      shipNote: parsed.data.shipNote?.trim() || null,
    },
  });

  revalidatePath(`/dashboard/orders/${order.id}`);
  revalidatePath("/dashboard/orders");
  return { ok: true };
}
