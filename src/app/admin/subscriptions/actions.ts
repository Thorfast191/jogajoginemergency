"use server";

import { revalidatePath } from "next/cache";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { entitledWhere } from "@/lib/subscription";
import { addMonths, extendPeriod } from "@/lib/subscription-periods";
import { audit } from "@/lib/audit";

// Handing out or taking away a published page is money: every action here
// needs `money.manage`, and every one is written to the activity log.

export type SubscriptionActionState = { error?: string; ok?: string };

const GRANT_MONTHS = [1, 3, 6, 12] as const;

function readMonths(formData: FormData): number | null {
  const n = Number(formData.get("months"));
  return (GRANT_MONTHS as readonly number[]).includes(n) ? n : null;
}

function revalidate(subscriptionId: string | null, userId: string) {
  revalidatePath("/admin/subscriptions");
  if (subscriptionId) revalidatePath(`/admin/subscriptions/${subscriptionId}`);
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin");
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Add months to a subscription, without a payment.
 *
 * From the current end while it is still ahead, otherwise from today. A
 * cancelled or lapsed subscription is reinstated; a complimentary one stays
 * complimentary.
 */
export async function extendSubscriptionAction(
  id: string,
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const actor = await getStaffWith("money.manage");
  if (!actor) return { error: "Only a super admin can extend subscriptions." };
  const months = readMonths(formData);
  if (!months) return { error: "Choose how many months to add." };

  const sub = await prisma.subscription.findUnique({
    where: { id },
    select: { status: true, currentPeriodEnd: true, userId: true, user: { select: { name: true } }, plan: { select: { name: true } } },
  });
  if (!sub) return { error: "Subscription not found." };

  const end = extendPeriod(sub.currentPeriodEnd, months, new Date());
  await prisma.subscription.update({
    where: { id },
    data: { currentPeriodEnd: end, status: sub.status === "TRIALING" ? "TRIALING" : "ACTIVE" },
  });
  await audit(
    actor.id,
    "subscription.extend",
    { type: "subscription", id },
    `Extended ${sub.user.name}'s ${sub.plan.name} subscription by ${months} month${months === 1 ? "" : "s"} (now ends ${day(end)})`,
  );
  revalidate(id, sub.userId);
  return { ok: `Extended — now runs until ${end.toLocaleDateString()}.` };
}

/**
 * Give a customer free time on a plan. Recorded as TRIALING, which the rest of
 * the platform already treats as entitled and the console labels complimentary.
 * Refused for someone already entitled — extend their subscription instead, so
 * nobody ends up with two overlapping rows.
 */
export async function grantComplimentaryAction(
  userId: string,
  _prev: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const actor = await getStaffWith("money.manage");
  if (!actor) return { error: "Only a super admin can grant subscriptions." };
  const months = readMonths(formData);
  if (!months) return { error: "Choose how many months to grant." };

  const planId = String(formData.get("planId") ?? "");
  const [user, plan, entitled, latest] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } }),
    prisma.subscriptionPlan.findUnique({ where: { id: planId }, select: { id: true, name: true } }),
    prisma.subscription.findFirst({ where: { userId, ...entitledWhere(new Date()) }, select: { id: true } }),
    prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: "desc" }, select: { id: true } }),
  ]);
  if (!user || user.role !== "USER") return { error: "Customer not found." };
  if (!plan) return { error: "Choose a plan." };
  if (entitled) return { error: "This customer already has an active subscription — extend it instead." };

  const end = addMonths(new Date(), months);
  // Reuse their existing row so their history stays on one record, the same
  // way a paid renewal does.
  const sub = latest
    ? await prisma.subscription.update({
        where: { id: latest.id },
        data: { planId: plan.id, status: "TRIALING", currentPeriodEnd: end },
        select: { id: true },
      })
    : await prisma.subscription.create({
        data: { userId, planId: plan.id, status: "TRIALING", currentPeriodEnd: end },
        select: { id: true },
      });

  await audit(
    actor.id,
    "subscription.grant",
    { type: "subscription", id: sub.id },
    `Granted ${user.name} ${months} complimentary month${months === 1 ? "" : "s"} of ${plan.name} (until ${day(end)})`,
  );
  revalidate(sub.id, userId);
  return { ok: `Granted — ${user.name}'s page is live until ${end.toLocaleDateString()}.` };
}

/**
 * End a subscription immediately. Unlike a customer's own cancel, which runs to
 * the end of the paid period, this unpublishes their page now — for a refund,
 * a chargeback or an abuse case.
 */
export async function cancelSubscriptionNowAction(id: string): Promise<SubscriptionActionState> {
  const actor = await getStaffWith("money.manage");
  if (!actor) return { error: "Only a super admin can cancel subscriptions." };

  const sub = await prisma.subscription.findUnique({
    where: { id },
    select: { currentPeriodEnd: true, userId: true, user: { select: { name: true } }, plan: { select: { name: true } } },
  });
  if (!sub) return { error: "Subscription not found." };

  const at = new Date();
  await prisma.subscription.update({
    where: { id },
    data: {
      status: "CANCELED",
      currentPeriodEnd: sub.currentPeriodEnd.getTime() > at.getTime() ? at : sub.currentPeriodEnd,
    },
  });
  await audit(
    actor.id,
    "subscription.cancel",
    { type: "subscription", id },
    `Cancelled ${sub.user.name}'s ${sub.plan.name} subscription immediately`,
  );
  revalidate(id, sub.userId);
  return { ok: "Cancelled. Their page stops showing their information now." };
}
