"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validations";
import { generateOrderNumber } from "@/lib/order";
import { readCart, resolveCart, writeCart } from "@/lib/cart-server";

export type CheckoutState = { error?: string };

/**
 * Buying a sticker grants QR slots, not a pre-made code. Nothing is allocated
 * from inventory here — the customer generates their own tags afterwards from
 * the client area, and `src/lib/slots.ts` decides how many they may make.
 */
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
    shipName: formData.get("shipName") || null,
    shipPhone: formData.get("shipPhone") || null,
    shipAddress: formData.get("shipAddress") || null,
    shipCity: formData.get("shipCity") || null,
    shipNote: formData.get("shipNote") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  // Prices come from the database via resolveCart, never from the form or the
  // cookie: the cart carries slugs and quantities and nothing else.
  const cart = await resolveCart(await readCart());
  if (cart.lines.length === 0) return { error: "Your cart is empty." };

  const { idempotencyKey } = parsed.data;

  // A resubmitted form (double-click, back-then-forward, a flaky connection
  // retrying the POST) must not place a second order or take a second payment.
  const replay = await findOwnOrderByKey(idempotencyKey, user.id);
  if (replay) redirect(`/checkout/success?order=${replay}`);

  let orderNumber = "";
  try {
    orderNumber = await prisma.$transaction(async (tx) => {
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
          subtotalCents: cart.totalCents,
          totalCents: cart.totalCents,
          currency: cart.currency,
          shipName: parsed.data.shipName ?? null,
          shipPhone: parsed.data.shipPhone ?? null,
          shipAddress: parsed.data.shipAddress ?? null,
          shipCity: parsed.data.shipCity ?? null,
          shipNote: parsed.data.shipNote ?? null,
          items: {
            create: cart.lines.map((line) => ({
              productId: line.productId,
              quantity: line.qty,
              unitPriceCents: line.unitPriceCents,
              currency: line.currency,
            })),
          },
        },
      });

      await tx.payment.create({
        data: {
          kind: "ORDER",
          orderId: order.id,
          amountCents: cart.totalCents,
          currency: cart.currency,
          provider: "DEMO",
          status: "SUCCEEDED",
          settledAt: new Date(),
          providerRef: `demo_${Date.now()}`,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", placedAt: new Date() },
      });

      return number;
    });
  } catch (e) {
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

  await writeCart([]);
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
