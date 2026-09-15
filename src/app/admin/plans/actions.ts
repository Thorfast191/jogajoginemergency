"use server";

import { revalidatePath } from "next/cache";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { planSchema, planTextSchema } from "@/lib/validations";
import { formatPrice } from "@/lib/money";
import { intervalLabel } from "@/lib/subscription-periods";
import { audit } from "@/lib/audit";

export type PlanState = { error?: string; success?: boolean };

function revalidate() {
  revalidatePath("/admin/plans");
  revalidatePath("/dashboard/subscription");
  revalidatePath("/");
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/** A new plan has a price, so creating one is a pricing decision. */
export async function createPlanAction(_prev: PlanState, formData: FormData): Promise<PlanState> {
  const actor = await getStaffWith("pricing.manage");
  if (!actor) return { error: "Only a super admin can create plans." };

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const clash = await prisma.subscriptionPlan.findUnique({ where: { slug: parsed.data.slug } });
  if (clash) return { error: "A plan with that slug already exists." };

  const plan = await prisma.subscriptionPlan.create({ data: parsed.data });
  await audit(
    actor.id,
    "plan.create",
    { type: "plan", id: plan.id },
    `Created the ${plan.name} plan at ${formatPrice(plan.priceCents, plan.currency)} / ${intervalLabel(plan.intervalMonths)}${plan.isActive ? "" : " (off)"}`,
  );
  revalidate();
  return { success: true };
}

/**
 * Save a plan.
 *
 * Any admin may reword it. The price, billing period and whether customers can
 * choose it are written only for someone with `pricing.manage`; for everyone
 * else those fields are not even parsed, so a crafted form cannot reprice it.
 */
export async function updatePlanAction(
  id: string,
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const actor = await getStaffWith("plans.edit");
  if (!actor) return { error: "Not authorized." };

  const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!existing) return { error: "Plan not found." };

  const fields = Object.fromEntries(formData);

  if (!can(actor.role, "pricing.manage")) {
    const parsed = planTextSchema.safeParse(fields);
    if (!parsed.success) return { error: firstIssue(parsed.error) };
    await prisma.subscriptionPlan.update({ where: { id }, data: parsed.data });
    revalidate();
    return { success: true };
  }

  // The slug is an identifier customers' forms post; it doesn't change here.
  const parsed = planSchema.safeParse({ ...fields, slug: existing.slug });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { slug: _slug, ...data } = parsed.data;
  void _slug;

  await prisma.subscriptionPlan.update({ where: { id }, data });

  const changes: string[] = [];
  if (data.priceCents !== existing.priceCents) {
    changes.push(
      `price ${formatPrice(existing.priceCents, existing.currency)} → ${formatPrice(data.priceCents, existing.currency)}`,
    );
  }
  if (data.intervalMonths !== existing.intervalMonths) {
    changes.push(`billing ${intervalLabel(existing.intervalMonths)} → ${intervalLabel(data.intervalMonths)}`);
  }
  if (data.isActive !== existing.isActive) {
    changes.push(data.isActive ? "switched on" : "switched off");
  }
  if (changes.length > 0) {
    await audit(actor.id, "plan.pricing", { type: "plan", id }, `${existing.name} plan: ${changes.join(", ")}`);
  }

  revalidate();
  return { success: true };
}
