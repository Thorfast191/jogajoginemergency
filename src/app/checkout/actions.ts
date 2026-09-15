"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validations";
import { generateOrderNumber } from "@/lib/order";
import { readCart, resolveCart } from "@/lib/cart-server";
import { enabledGatewayFor } from "@/lib/payments/enabled";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/payments/config";
import { warnOnOriginMismatch } from "@/lib/app-origin";
import { GatewayError } from "@/lib/payments/types";

export type CheckoutState = { error?: string };

/**
 * Place an order and hand the customer to their chosen payment gateway.
 *
 * Nothing is fulfilled here. The order is created PENDING with a PENDING
 * payment whose id is the merchant reference; only the verified callback
 * (src/lib/payments/settle.ts) marks it PAID, which is what grants QR slots.
 * The cart is likewise cleared on settlement, not on redirect — a customer who
 * abandons the gateway comes back to a cart that still has their stickers in.
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
    provider: formData.get("provider"),
    shipName: formData.get("shipName") || null,
    shipPhone: formData.get("shipPhone") || null,
    shipAddress: formData.get("shipAddress") || null,
    shipCity: formData.get("shipCity") || null,
    shipNote: formData.get("shipNote") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  // A super admin can pause new orders (out of stock, a holiday). Checked here
  // and not just hidden in the UI, so an open checkout tab can't slip one in.
  const settings = await getSettings();
  if (settings.ordersPaused) {
    return { error: settings.ordersPausedMessage ?? "The shop isn't taking new orders right now." };
  }

  // Prices come from the database via resolveCart, never from the form or the
  // cookie: the cart carries slugs and quantities and nothing else.
  const cart = await resolveCart(await readCart());
  if (cart.lines.length === 0) return { error: "Your cart is empty." };

  let gateway;
  try {
    gateway = await enabledGatewayFor(parsed.data.provider);
  } catch {
    return { error: "That payment method isn't available." };
  }

  const { idempotencyKey } = parsed.data;
  const existing = await findOwnOrderByKey(idempotencyKey, user.id);
  if (existing?.status === "PAID") {
    redirect(`/checkout/success?order=${existing.orderNumber}`);
  }

  let paymentId = "";
  let orderId = existing?.id ?? "";
  try {
    if (!orderId) {
      ({ orderId } = await prisma.$transaction(async (tx) => {
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
        return { orderId: order.id };
      }));
    }
  } catch (e) {
    // Two submits of the same form raced and the other one won.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const winner = await findOwnOrderByKey(idempotencyKey, user.id);
      if (!winner) throw e;
      if (winner.status === "PAID") redirect(`/checkout/success?order=${winner.orderNumber}`);
      orderId = winner.id;
    } else {
      throw e;
    }
  }

  const payment = await prisma.payment.create({
    data: {
      kind: "ORDER",
      orderId,
      amountCents: cart.totalCents,
      currency: cart.currency,
      provider: gateway.id,
      status: "PENDING",
    },
    select: { id: true },
  });
  paymentId = payment.id;

  let redirectUrl: string;
  try {
    await warnOnOriginMismatch("checkout");
    const result = await gateway.initiate({
      paymentId,
      amountCents: cart.totalCents,
      currency: cart.currency,
      description: cart.lines.map((l) => l.name).join(", ").slice(0, 100),
      customer: { name: user.name, email: user.email },
      callbackUrl: `${appUrl()}/api/payments/callback?payment=${paymentId}`,
    });
    redirectUrl = result.redirectUrl;
    if (result.gatewayPaymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { gatewayPaymentId: result.gatewayPaymentId },
      });
    }
  } catch (e) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: "FAILED",
        failureReason: e instanceof Error ? e.message.slice(0, 200) : "Gateway error",
      },
    });
    console.error("[checkout] gateway initiate failed:", e);
    return {
      error:
        e instanceof GatewayError
          ? e.message
          : "We couldn't reach the payment provider. Please try again.",
    };
  }

  redirect(redirectUrl);
}

/** The order previously placed under this key, if it belongs to this user. */
async function findOwnOrderByKey(key: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { idempotencyKey: key },
    select: { id: true, orderNumber: true, userId: true, status: true },
  });
  return order && order.userId === userId ? order : null;
}
