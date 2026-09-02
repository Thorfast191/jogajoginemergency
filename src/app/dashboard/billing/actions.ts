"use server";

import { revalidatePath } from "next/cache";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function changePlanAction(planSlug: string) {
  const user = await getCustomer();
  if (!user) return { error: "Not authorized." };

  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
  if (!plan) return { error: "Plan not found." };

  const currentTagCount = await prisma.tag.count({ where: { userId: user.id } });
  if (currentTagCount > plan.maxTags) {
    return {
      error: `You have ${currentTagCount} tags, which exceeds this plan's limit of ${plan.maxTags}. Remove tags before downgrading.`,
    };
  }

  const active = await prisma.subscription.findFirst({
    where: { userId: user.id, status: "ACTIVE" },
  });

  if (active) {
    await prisma.subscription.update({
      where: { id: active.id },
      data: {
        planId: plan.id,
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        payments: {
          create: {
            amountCents: plan.priceCents,
            currency: plan.currency,
            provider: "DEMO",
            status: "SUCCEEDED",
            providerRef: `demo_${Date.now()}`,
          },
        },
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: "ACTIVE",
        provider: "DEMO",
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        payments: {
          create: {
            amountCents: plan.priceCents,
            currency: plan.currency,
            provider: "DEMO",
            status: "SUCCEEDED",
            providerRef: `demo_${Date.now()}`,
          },
        },
      },
    });
  }

  revalidatePath("/dashboard/billing");
  return {};
}
