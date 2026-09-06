"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { gatewayFor } from "@/lib/payments/registry";
import { appUrl } from "@/lib/payments/config";
import { GatewayError } from "@/lib/payments/types";

/**
 * Start or renew a subscription by sending the customer to a gateway.
 *
 * As with orders, nothing is activated here: the subscription is created (or
 * left) inactive with a PENDING payment, and only the verified callback in
 * src/lib/payments/settle.ts sets it ACTIVE and extends the period.
 */
export async function subscribeAction(formData: FormData): Promise<void> {
  const user = await requireCustomer();

  const planSlug = String(formData.get("planSlug") ?? "");
  const providerId = String(formData.get("provider") ?? "");

  const plan = await prisma.subscriptionPlan.findFirst({
    where: { slug: planSlug, isActive: true },
  });
  if (!plan) redirect("/dashboard/subscription?payment=unknown-plan");

  let gateway;
  try {
    gateway = gatewayFor(providerId);
  } catch {
    redirect("/dashboard/subscription?payment=unavailable");
  }

  // Reuse the customer's subscription row across renewals so their history
  // stays on one record; settlement is what makes it active.
  const existing = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const subscription = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: { planId: plan.id, provider: gateway.id },
        select: { id: true },
      })
    : await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: "CANCELED",
          provider: gateway.id,
          // Set in the past so an unpaid subscription never entitles; the
          // callback moves it forward a year.
          currentPeriodEnd: new Date(0),
        },
        select: { id: true },
      });

  const payment = await prisma.payment.create({
    data: {
      kind: "SUBSCRIPTION",
      subscriptionId: subscription.id,
      amountCents: plan.priceCents,
      currency: plan.currency,
      provider: gateway.id,
      status: "PENDING",
    },
    select: { id: true },
  });

  let redirectUrl: string;
  try {
    const result = await gateway.initiate({
      paymentId: payment.id,
      amountCents: plan.priceCents,
      currency: plan.currency,
      description: `${plan.name} subscription`,
      customer: { name: user.name, email: user.email },
      callbackUrl: `${appUrl()}/api/payments/callback?payment=${payment.id}`,
    });
    redirectUrl = result.redirectUrl;
    if (result.gatewayPaymentId) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { gatewayPaymentId: result.gatewayPaymentId },
      });
    }
  } catch (e) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "FAILED",
        failureReason: e instanceof Error ? e.message.slice(0, 200) : "Gateway error",
      },
    });
    console.error("[subscription] gateway initiate failed:", e);
    redirect(
      `/dashboard/subscription?payment=${e instanceof GatewayError ? "unavailable" : "error"}`,
    );
  }

  redirect(redirectUrl);
}

/**
 * Cancel. The period end is deliberately left alone, so the customer keeps
 * what they paid for until it runs out — `activeSubscriptionStatus` only counts
 * ACTIVE/TRIALING rows, so flipping the status is what ends entitlement.
 */
export async function cancelSubscriptionAction(): Promise<void> {
  const user = await requireCustomer();

  await prisma.subscription.updateMany({
    where: { userId: user.id, status: { in: ["ACTIVE", "TRIALING"] } },
    data: { status: "CANCELED" },
  });

  revalidatePath("/dashboard/subscription");
  revalidatePath("/dashboard");
}
