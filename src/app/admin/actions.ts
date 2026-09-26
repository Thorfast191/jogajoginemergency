"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getStaffWith } from "@/lib/session";
import { can, isStaff } from "@/lib/permissions";
import { canSetTagStatus, canSetUserStatus, type Role } from "@/lib/admin-guards";
import { audit } from "@/lib/audit";
import { firstIssue } from "@/lib/validations";

export type AdminActionState = { error?: string; ok?: boolean };

const customerIdentitySchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email("Enter a valid email address."),
});

const TAG_STATUSES = ["ACTIVE", "LOST", "DEACTIVATED"] as const;
type TagStatus = (typeof TAG_STATUSES)[number];

// --- Users --------------------------------------------------------------

/**
 * Suspend or reactivate a customer. Destructive, so super admins only.
 *
 * Returns the refusal rather than throwing: these are called from buttons, and
 * a staff member whose role was narrowed mid-session should read a sentence,
 * not trip an error overlay.
 */
export async function setUserStatusAction(
  userId: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<AdminActionState> {
  const actor = await getStaffWith("destructive");
  if (!actor) return { error: "Only a super admin can suspend or reactivate an account." };
  if (status !== "ACTIVE" && status !== "SUSPENDED") return { error: "Invalid status." };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!target) return { error: "User not found." };

  // Suspending an admin is a demotion in disguise, and suspending yourself
  // locks you out of the console. Both go through /admin/admins instead.
  const guard = canSetUserStatus({
    actorId: actor.id,
    targetId: target.id,
    targetRole: target.role as Role,
  });
  if (!guard.ok) return { error: guard.reason };
  if (target.status === status) return { ok: true };

  await prisma.user.update({ where: { id: target.id }, data: { status } });
  await audit(
    actor.id,
    status === "SUSPENDED" ? "user.suspend" : "user.reactivate",
    { type: "user", id: target.id },
    `${status === "SUSPENDED" ? "Suspended" : "Reactivated"} ${target.name} (${target.email})`,
  );
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${target.id}`);
  return { ok: true };
}

/**
 * Correct a customer's name or sign-in email on their behalf.
 *
 * A support desk needs this — people mistype their own email at signup and
 * then cannot receive a reset link. Restricted to customers: an admin's own
 * details are changed at /admin/profile, and another admin's are theirs alone.
 */
/**
 * Correct a customer's name or email.
 *
 * Audited, and an email change is audited loudly. Changing the address on an
 * account is a route to everything in it: set it to one you control, ask for a
 * password reset, and you are signed in as that customer, reading their blood
 * group, their medical notes and who to call. That is a support tool an admin
 * legitimately needs, so the control is the record — a super admin can see, in
 * the activity log, every address that was ever changed and by whom.
 */
export async function updateCustomerIdentityAction(
  userId: string,
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const actor = await getStaffWith("users.manage");
  if (!actor) return { error: "Not authorized." };

  const parsed = customerIdentitySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true, email: true },
  });
  if (!target) return { error: "User not found." };
  if (isStaff(target.role)) return { error: "Admin accounts are edited by their owners at /admin/profile." };

  const email = parsed.data.email.trim().toLowerCase();
  const clash = await prisma.user.findFirst({
    where: { email, NOT: { id: target.id } },
    select: { id: true },
  });
  if (clash) return { error: "Another account already uses that email." };

  const name = parsed.data.name.trim();
  const emailChanged = email !== target.email;
  const nameChanged = name !== target.name;

  await prisma.user.update({
    where: { id: target.id },
    data: { name, email },
  });

  if (emailChanged || nameChanged) {
    const changes: string[] = [];
    if (emailChanged) changes.push(`email ${target.email} → ${email}`);
    if (nameChanged) changes.push(`name "${target.name ?? ""}" → "${name}"`);
    await audit(
      actor.id,
      emailChanged ? "customer.email" : "customer.name",
      { type: "user", id: target.id },
      `${target.email}: ${changes.join(", ")}`,
    );
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${target.id}`);
  return { ok: true };
}

// --- Tags ---------------------------------------------------------------
// Tags are generated by customers against QR slots they bought, so there is no
// inventory to assign or reclaim. Any admin can mark a tag lost or active for a
// support case. Taking one down — or undoing a takedown — is destructive and
// belongs to super admins, and is recorded in the activity log.

export async function setTagStatusAction(tagId: string, status: TagStatus): Promise<AdminActionState> {
  const actor = await getStaffWith("tags.manage");
  if (!actor) return { error: "Not authorized." };
  if (!TAG_STATUSES.includes(status)) return { error: "Invalid status." };

  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
    select: { id: true, shortCode: true, status: true, takenDownAt: true },
  });
  if (!tag) return { error: "Tag not found." };

  const takenDown = tag.takenDownAt !== null;
  // Already in that state — except that taking down a code its owner had
  // switched off is a real change: it stops them switching it back on.
  if (tag.status === status && (status !== "DEACTIVATED" || takenDown)) return { ok: true };

  const verdict = canSetTagStatus({
    by: "staff",
    mayTakeDown: can(actor.role, "destructive"),
    current: tag.status,
    takenDown,
    next: status,
  });
  if (!verdict.ok) return { error: verdict.reason };

  await prisma.tag.update({
    where: { id: tag.id },
    data: { status, takenDownAt: verdict.takenDown ? new Date() : null },
  });
  if (verdict.takenDown !== takenDown) {
    await audit(
      actor.id,
      verdict.takenDown ? "tag.deactivate" : "tag.reactivate",
      { type: "tag", id: tag.id },
      verdict.takenDown
        ? `Took down /t/${tag.shortCode}`
        : `Lifted the takedown on /t/${tag.shortCode} (now ${status.toLowerCase()})`,
    );
  }

  revalidatePath("/admin/tags");
  revalidatePath(`/admin/tags/${tag.id}`);
  revalidatePath("/admin");
  revalidatePath(`/dashboard/tags/${tag.id}`);
  revalidatePath("/dashboard/tags");
  return { ok: true };
}

// --- Abuse reports --------------------------------------------------

const REPORT_STATUSES = ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"] as const;

/** Move a report along — or back to OPEN, when one was closed by mistake. */
export async function resolveAbuseReportAction(
  reportId: string,
  status: (typeof REPORT_STATUSES)[number],
): Promise<AdminActionState> {
  // `tags.manage`, not `console.view`: closing a safety report is a decision
  // about a QR code, and the weakest permission in the console should not carry
  // it. Acting on one — taking the code down — still needs `destructive`.
  const actor = await getStaffWith("tags.manage");
  if (!actor) return { error: "Not authorized." };
  if (!REPORT_STATUSES.includes(status)) return { error: "Invalid status." };

  const report = await prisma.abuseReport.findUnique({
    where: { id: reportId },
    select: { id: true, status: true, tag: { select: { shortCode: true } } },
  });
  if (!report) return { error: "That report no longer exists." };

  await prisma.abuseReport.update({
    where: { id: reportId },
    data: { status, resolvedAt: status === "RESOLVED" || status === "DISMISSED" ? new Date() : null },
  });

  // Who closed a report on someone's page, and when, is exactly what a
  // complaint about the decision will ask for.
  await audit(
    actor.id,
    "abuse-report.status",
    { type: "abuse-report", id: reportId },
    `Report on /t/${report.tag?.shortCode ?? "?"}: ${report.status} → ${status}`,
  );

  revalidatePath("/admin/abuse-reports");
  return { ok: true };
}
