import { prisma } from "@/lib/prisma";
import { gatewayFor } from "./registry";
import { amountMatches, nextPaymentStatus, type SettleStatus } from "./core";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export type SettleOutcome = {
  status: SettleStatus;
  /** Where to send the customer afterwards. */
  redirectTo: string;
  reason?: string;
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
      order: { select: { id: true, orderNumber: true, status: true } },
      subscription: { select: { id: true, planId: true } },
    },
  });
  if (!payment) return { status: "FAILED", redirectTo: "/dashboard", reason: "Unknown payment." };

  const done =
    payment.kind === "ORDER"
      ? `/checkout/success?order=${payment.order?.orderNumber ?? ""}`
      : "/dashboard/subscription";
  const failed =
    payment.kind === "ORDER" ? "/checkout?payment=failed" : "/dashboard/subscription?payment=failed";

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

  const next = nextPaymentStatus(payment.status as SettleStatus, status);
  if (!next) {
    return { status: payment.status as SettleStatus, redirectTo: status === "SUCCEEDED" ? done : failed, reason };
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
    }

    if (payment.kind === "SUBSCRIPTION" && payment.subscription) {
      await tx.subscription.update({
        where: { id: payment.subscription.id },
        data: { status: "ACTIVE", currentPeriodEnd: new Date(Date.now() + YEAR_MS) },
      });
    }
  });

  return { status: next, redirectTo: next === "SUCCEEDED" ? done : failed, reason };
}
