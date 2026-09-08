"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canDemoteAdmin, canPromoteUser, type Role, type Status } from "@/lib/admin-guards";

export type AdminsState = { error?: string; success?: string };

function revalidate() {
  revalidatePath("/admin/admins");
  revalidatePath("/admin/users");
}

/**
 * Give an existing account admin rights, by the email it signs in with.
 *
 * Promotion rather than invitation: the person must already have signed up, so
 * there is no unclaimed admin account sitting around waiting to be taken.
 */
export async function promoteToAdminAction(
  _prev: AdminsState,
  formData: FormData,
): Promise<AdminsState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Enter the email of the account to promote." };

  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true, status: true },
  });
  if (!target) return { error: "No account uses that email." };

  const guard = canPromoteUser({
    targetRole: target.role as Role,
    targetStatus: target.status as Status,
  });
  if (!guard.ok) return { error: guard.reason };

  await prisma.user.update({ where: { id: target.id }, data: { role: "ADMIN" } });
  revalidate();
  return { success: `${target.name} is now an admin.` };
}

/**
 * Take admin rights away, leaving the account as an ordinary customer.
 *
 * The count is read inside the same call that writes, so two admins demoting
 * each other at once cannot both pass the "last admin" check.
 */
export async function demoteAdminAction(
  _prev: AdminsState,
  formData: FormData,
): Promise<AdminsState> {
  const actor = await requireAdmin();
  const targetId = String(formData.get("userId") ?? "");

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, name: true, role: true },
  });
  if (!target) return { error: "Account not found." };

  try {
    await prisma.$transaction(async (tx) => {
      const adminCount = await tx.user.count({ where: { role: "ADMIN" } });
      const guard = canDemoteAdmin({
        actorId: actor.id,
        targetId: target.id,
        targetRole: target.role as Role,
        adminCount,
      });
      if (!guard.ok) throw new Error(guard.reason);

      await tx.user.update({ where: { id: target.id }, data: { role: "USER" } });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not demote that account." };
  }

  revalidate();
  return { success: `${target.name} is no longer an admin.` };
}
