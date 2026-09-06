"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Start or renew a Plus subscription.
 *
 * Payments run through the DEMO provider and are marked succeeded inline. When
 * a real gateway lands this becomes: create PENDING, redirect to the gateway,
 * and let the webhook flip status and extend currentPeriodEnd.
 *
 * Note there is no tag-count check. Tags are bought outright; a subscription
 * unlocks presentation features, never the right to own a tag.
 */
export async function subscribeAction(formData: FormData): Promise<void> {
  const user = await requireCustomer();

  const planSlug = String(formData.get("planSlug") ?? "");
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { slug: planSlug, isActive: true },
  });
  if (!plan) return;

  const periodEnd = new Date(Date.now() + YEAR_MS);
  const payment = {
    create: {
      amountCents: plan.priceCents,
      currency: plan.currency,
      provider: "DEMO" as const,
      status: "SUCCEEDED" as const,
      providerRef: `demo_${Date.now()}`,
    },
  };

  const existing = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { id: existing.id },
      data: { planId: plan.id, status: "ACTIVE", currentPeriodEnd: periodEnd, payments: payment },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: "ACTIVE",
        provider: "DEMO",
        currentPeriodEnd: periodEnd,
        payments: payment,
      },
    });
  }

  revalidatePath("/dashboard/subscription");
  revalidatePath("/dashboard");
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
