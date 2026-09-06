"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validations";
import { generateOrderNumber, allocateTags } from "@/lib/order";

export type CheckoutState = { error?: string };

export async function createOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const parsed = checkoutSchema.safeParse({
    idempotencyKey: formData.get("idempotencyKey"),
    productSlug: formData.get("productSlug"),
    quantity: formData.get("quantity"),
    shipName: formData.get("shipName") || null,
    shipPhone: formData.get("shipPhone") || null,
    shipAddress: formData.get("shipAddress") || null,
    shipCity: formData.get("shipCity") || null,
    shipNote: formData.get("shipNote") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const product = await prisma.product.findUnique({ where: { slug: parsed.data.productSlug } });
  if (!product || product.status !== "ACTIVE") return { error: "That product isn't available." };

  const qty = parsed.data.quantity;
  const total = product.priceCents * qty;
  const { idempotencyKey } = parsed.data;

  // A resubmitted form (double-click, back-then-forward, a flaky connection
  // retrying the POST) must not place a second order, take a second payment,
  // and burn two more tags out of inventory.
  const replay = await findOwnOrderByKey(idempotencyKey, user.id);
  if (replay) redirect(`/checkout/success?order=${replay}`);

  let orderNumber = "";
  try {
    orderNumber = await prisma.$transaction(async (tx) => {
      // Unique order number with a small retry.
      let number = generateOrderNumber();
      for (let i = 0; i < 5; i++) {
        const clash = await tx.order.findUnique({ where: { orderNumber: number } });
        if (!clash) break;
        number = generateOrderNumber();
      }

      const order = await tx.order.create({
        data: {
          orderNumber: number,
          idempotencyKey,
          userId: user.id,
          status: "PENDING",
          subtotalCents: total,
          totalCents: total,
          currency: product.currency,
          shipName: parsed.data.shipName ?? null,
          shipPhone: parsed.data.shipPhone ?? null,
          shipAddress: parsed.data.shipAddress ?? null,
          shipCity: parsed.data.shipCity ?? null,
          shipNote: parsed.data.shipNote ?? null,
        },
      });

      const item = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: qty,
          unitPriceCents: product.priceCents,
          currency: product.currency,
        },
      });

      const tagIds = await allocateTags(tx, {
        productId: product.id,
        orderItemId: item.id,
        quantity: qty,
      });

      await tx.payment.create({
        data: {
          kind: "ORDER",
          orderId: order.id,
          amountCents: total,
          currency: product.currency,
          provider: "DEMO",
          status: "SUCCEEDED",
          providerRef: `demo_${Date.now()}`,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", placedAt: new Date() },
      });

      await tx.tag.updateMany({
        where: { id: { in: tagIds } },
        data: { userId: user.id, status: "ACTIVE" },
      });

      return number;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "OUT_OF_STOCK") {
      console.warn(`[checkout] out of stock: product=${product.slug} qty=${qty}`);
      return { error: "Sorry, that product just sold out. We're restocking — please check back." };
    }
    // Two submits of the same form raced and the other one won. Whether the
    // clash was on our key (rather than the retried order number) is settled
    // by looking it up: if an order now exists under it, that is the winner.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const winner = await findOwnOrderByKey(idempotencyKey, user.id);
      if (!winner) throw e;
      orderNumber = winner;
    } else {
      throw e;
    }
  }

  redirect(`/checkout/success?order=${orderNumber}`);
}

/**
 * The order previously placed under this key, if it belongs to this user.
 * Scoped by owner so a leaked key can never surface someone else's order.
 */
async function findOwnOrderByKey(key: string, userId: string): Promise<string | null> {
  const order = await prisma.order.findUnique({
    where: { idempotencyKey: key },
    select: { orderNumber: true, userId: true },
  });
  return order && order.userId === userId ? order.orderNumber : null;
}
