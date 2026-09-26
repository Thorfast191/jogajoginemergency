"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkoutSchema, firstIssue } from "@/lib/validations";
import { generateOrderNumber, orderMatchesCart, orderPlanMatchesCart } from "@/lib/order";
import { readResolvedCart } from "@/lib/cart-server";
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
 *
 * The cart may also carry a plan. It is paid for in this one payment and
 * activated by the same callback, so a customer never buys a sticker and then
 * discovers that the page it opens costs again.
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
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  // A super admin can pause new orders (out of stock, a holiday). Checked here
  // and not just hidden in the UI, so an open checkout tab can't slip one in.
  const settings = await getSettings();
  if (settings.ordersPaused) {
    return { error: settings.ordersPausedMessage ?? "The shop isn't taking new orders right now." };
  }

  // Prices come from the database via resolveCart, never from the form or the
  // cookie: the cart carries slugs and quantities and nothing else.
  const cart = await readResolvedCart();
  if (cart.lines.length === 0) return { error: "Your cart is empty." };

  const cartPlan = {
    planId: cart.plan?.id ?? null,
    planPriceCents: cart.plan?.priceCents ?? null,
  };

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

  // Submitting the same form again resumes the order it created. That order is
  // what gets paid for, so the cart must still describe it: billing today's
  // cart against yesterday's order once let one sticker's price pay for five.
  if (
    existing &&
    (!orderMatchesCart(existing.items, cart.lines) ||
      !orderPlanMatchesCart(existing, cartPlan))
  ) {
    return { error: CART_CHANGED };
  }

  let paymentId = "";
  let orderId = existing?.id ?? "";
  let amount = existing
    ? { totalCents: existing.totalCents, currency: existing.currency }
    : { totalCents: cart.totalCents, currency: cart.currency };
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
            // Subtotal is the goods; the total is what the gateway charges, so
            // it carries the plan too.
            subtotalCents: cart.goodsCents,
            totalCents: cart.totalCents,
            currency: cart.currency,
            planId: cartPlan.planId,
            planPriceCents: cartPlan.planPriceCents,
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
                themeId: line.themeId,
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
      if (!orderMatchesCart(winner.items, cart.lines) || !orderPlanMatchesCart(winner, cartPlan)) {
        return { error: CART_CHANGED };
      }
      orderId = winner.id;
      amount = { totalCents: winner.totalCents, currency: winner.currency };
    } else {
      throw e;
    }
  }

  const payment = await prisma.payment.create({
    data: {
      kind: "ORDER",
      orderId,
      amountCents: amount.totalCents,
      currency: amount.currency,
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
      amountCents: amount.totalCents,
      currency: amount.currency,
      description: [...cart.lines.map((l) => l.name), ...(cart.plan ? [`${cart.plan.name} plan`] : [])]
        .join(", ")
        .slice(0, 100),
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

const CART_CHANGED =
  "Your cart changed after this checkout page was opened. Please reload the page to review your order.";

/** The order previously placed under this key, if it belongs to this user. */
async function findOwnOrderByKey(key: string, userId: string) {
  const order = await prisma.order.findUnique({
    where: { idempotencyKey: key },
    select: {
      id: true,
      orderNumber: true,
      userId: true,
      status: true,
      totalCents: true,
      currency: true,
      planId: true,
      planPriceCents: true,
      items: {
        select: {
          productId: true,
          quantity: true,
          unitPriceCents: true,
          currency: true,
          themeId: true,
        },
      },
    },
  });
  return order && order.userId === userId ? order : null;
}
