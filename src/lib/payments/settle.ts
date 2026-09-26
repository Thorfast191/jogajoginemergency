import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { gatewayFor } from "./registry";
import { amountMatches, nextPaymentStatus, paymentCoversOrder, type SettleStatus } from "./core";
import { extendPeriod } from "@/lib/subscription-periods";

export type SettleOutcome = {
  status: SettleStatus;
  /** Where to send the customer afterwards. */
  redirectTo: string;
  reason?: string;
  /** Set when this call is the one that marked an order paid. */
  fulfilledOrderId?: string;
};

/**
 * Apply a gateway callback to a payment, and to whatever it was paying for.
 *
 * Safe to run repeatedly: providers retry callbacks, and the browser redirect
 * races the server-to-server notification, so this is written to be called
 * more than once for the same payment.
 */
export async function settlePayment(
  paymentId: string,
  params: Record<string, string>,
): Promise<SettleOutcome> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalCents: true,
          currency: true,
          userId: true,
          planId: true,
          plan: { select: { intervalMonths: true } },
        },
      },
      subscription: {
        select: {
          id: true,
          planId: true,
          currentPeriodEnd: true,
          plan: { select: { intervalMonths: true } },
        },
      },
    },
  });
  // A reference we don't recognise: tell the customer something went wrong
  // rather than dropping them on the dashboard with no explanation.
  if (!payment) {
    return { status: "FAILED", redirectTo: "/dashboard?payment=unknown", reason: "Unknown payment." };
  }

  const done =
    payment.kind === "ORDER"
      ? `/checkout/success?order=${payment.order?.orderNumber ?? ""}`
      : "/dashboard/subscription";
  const failedFor = (outcome: SettleStatus) => {
    const code = outcome === "CANCELLED" ? "cancelled" : "failed";
    return payment.kind === "ORDER"
      ? `/checkout?payment=${code}`
      : `/dashboard/subscription?payment=${code}`;
  };

  // Already settled successfully — a duplicate callback. Nothing to do but
  // send the customer where they were going.
  if (payment.status === "SUCCEEDED") return { status: "SUCCEEDED", redirectTo: done };

  const gateway = gatewayFor(payment.provider);
  const result = await gateway.verify(params, {
    id: payment.id,
    amountCents: payment.amountCents,
    currency: payment.currency,
    gatewayPaymentId: payment.gatewayPaymentId,
  });

  // The gateway says it took money — but is it *our* money, for *this* order?
  // A mismatch means the amount was edited in flight or the callback belongs
  // to a different record. Either way this must not fulfil anything.
  let status = result.status;
  let reason = result.reason;
  if (
    status === "SUCCEEDED" &&
    !amountMatches(payment.amountCents, result.amount, payment.currency, result.currency)
  ) {
    status = "FAILED";
    reason = "Paid amount did not match the order.";
    console.error(
      `[payments] amount mismatch on ${payment.id}: expected ${payment.amountCents} ${payment.currency}, gateway reported ${String(result.amount)} ${String(result.currency)}`,
    );
  }

  // And is this payment for the whole order? Checked against the order, not
  // just the payment row, so no way of creating a payment can settle an order
  // for less than it costs.
  if (status === "SUCCEEDED" && payment.kind === "ORDER" && payment.order && !paymentCoversOrder(payment, payment.order)) {
    status = "FAILED";
    reason = "Paid amount did not match the order.";
    console.error(
      `[payments] payment ${payment.id} (${payment.amountCents} ${payment.currency}) does not cover order ${payment.order.orderNumber} (${payment.order.totalCents} ${payment.order.currency})`,
    );
  }

  const next = nextPaymentStatus(payment.status as SettleStatus, status);
  if (!next) {
    return { status: payment.status as SettleStatus, redirectTo: status === "SUCCEEDED" ? done : failedFor(status), reason };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: next,
        providerRef: result.providerRef ?? payment.providerRef,
        failureReason: next === "SUCCEEDED" ? null : (reason ?? null),
        settledAt: new Date(),
      },
    });

    if (next !== "SUCCEEDED") {
      if (payment.kind === "ORDER" && payment.order && payment.order.status === "PENDING") {
        await tx.order.update({
          where: { id: payment.order.id },
          data: { status: "CANCELLED" },
        });
      }
      return;
    }

    if (payment.kind === "ORDER" && payment.order) {
      // Paying is what grants the QR slots — see src/lib/slots.ts.
      await tx.order.update({
        where: { id: payment.order.id },
        data: { status: "PAID", placedAt: new Date() },
      });

      // An order can carry a plan, bought in the same checkout. One payment
      // covered both, so this is where the page is published — not a second
      // trip to a gateway the customer never knew about.
      if (payment.order.planId && payment.order.plan) {
        const subscriptionId = await activateSubscription(tx, {
          userId: payment.order.userId,
          planId: payment.order.planId,
          intervalMonths: payment.order.plan.intervalMonths,
          provider: payment.provider,
        });

        // This one payment bought the stickers *and* the plan, so it is linked
        // to both. Without it, the console answers "why is this page live, who
        // paid for it?" with "no payments on this subscription". `kind` stays
        // ORDER — it is what decides how this settles, and must not change.
        await tx.payment.update({
          where: { id: payment.id },
          data: { subscriptionId },
        });
      }
    }

    if (payment.kind === "SUBSCRIPTION" && payment.subscription) {
      // By the plan's own billing period, and from the current end while it's
      // still ahead — renewing early never costs the days already paid for.
      await tx.subscription.update({
        where: { id: payment.subscription.id },
        data: {
          status: "ACTIVE",
          currentPeriodEnd: extendPeriod(
            payment.subscription.currentPeriodEnd,
            payment.subscription.plan.intervalMonths,
            new Date(),
          ),
        },
      });
    }
  });

  return {
    status: next,
    redirectTo: next === "SUCCEEDED" ? done : failedFor(next),
    reason,
    fulfilledOrderId:
      next === "SUCCEEDED" && payment.kind === "ORDER" ? payment.order?.id : undefined,
  };
}

/**
 * Start or extend this customer's subscription, by the plan's own period.
 *
 * One row per customer across renewals, as `subscribeAction` does it, so their
 * billing history stays on one record. A customer whose plan is still running
 * keeps the days they already paid for — `extendPeriod` counts from the current
 * end while it is ahead.
 */
async function activateSubscription(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    planId: string;
    intervalMonths: number;
    provider: string;
  },
): Promise<string> {
  const existing = await tx.subscription.findFirst({
    where: { userId: params.userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, currentPeriodEnd: true },
  });

  const provider = params.provider as Prisma.SubscriptionCreateInput["provider"];
  const now = new Date();

  if (existing) {
    await tx.subscription.update({
      where: { id: existing.id },
      data: {
        planId: params.planId,
        provider,
        status: "ACTIVE",
        currentPeriodEnd: extendPeriod(existing.currentPeriodEnd, params.intervalMonths, now),
      },
    });
    return existing.id;
  }

  const created = await tx.subscription.create({
    data: {
      userId: params.userId,
      planId: params.planId,
      provider,
      status: "ACTIVE",
      currentPeriodEnd: extendPeriod(new Date(0), params.intervalMonths, now),
    },
    select: { id: true },
  });
  return created.id;
}
