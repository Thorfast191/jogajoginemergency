"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canChangeRole, type Role, type Status } from "@/lib/admin-guards";
import { roleLabel } from "@/lib/permissions";
import { audit } from "@/lib/audit";

export type AdminsState = { error?: string; success?: string };

const ROLES: readonly Role[] = ["USER", "ADMIN", "SUPER_ADMIN"];

class GuardRefused extends Error {}

function revalidate() {
  revalidatePath("/admin/admins");
  revalidatePath("/admin/users");
}

/**
 * Move one account to a new role.
 *
 * The super admin count is read inside a serializable transaction with the
 * write, so two super admins demoting each other at once cannot both pass the
 * "last super admin" check. Stamping `roleChangedAt` revokes the target's
 * outstanding sessions: their JWT still names the old role, and would
 * otherwise send them to a console that now refuses them.
 */
async function changeRole(
  actorId: string,
  where: { id: string } | { email: string },
  nextRole: Role,
): Promise<AdminsState> {
  const target = await prisma.user.findUnique({
    where,
    select: { id: true, name: true, email: true, role: true, status: true },
  });
  if (!target) return { error: "email" in where ? "No account uses that email." : "Account not found." };

  try {
    await prisma.$transaction(
      async (tx) => {
        const superAdminCount = await tx.user.count({ where: { role: "SUPER_ADMIN" } });
        const guard = canChangeRole({
          actorId,
          targetId: target.id,
          targetRole: target.role as Role,
          targetStatus: target.status as Status,
          nextRole,
          superAdminCount,
        });
        if (!guard.ok) throw new GuardRefused(guard.reason);

        await tx.user.update({
          where: { id: target.id },
          data: { role: nextRole, roleChangedAt: new Date() },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    if (e instanceof GuardRefused) return { error: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      return { error: "Someone else changed admin access at the same moment. Try again." };
    }
    throw e;
  }

  await audit(
    actorId,
    "admin.role",
    { type: "user", id: target.id },
    `Changed ${target.name} (${target.email}) from ${roleLabel(target.role)} to ${roleLabel(nextRole)}`,
  );
  revalidate();

  return {
    success:
      nextRole === "USER"
        ? `${target.name} no longer has admin access.`
        : `${target.name} is now ${nextRole === "SUPER_ADMIN" ? "a super admin" : "an admin"}.`,
  };
}

/**
 * Give an existing account admin rights, by the email it signs in with.
 *
 * Promotion rather than invitation: the person must already have signed up, so
 * there is no unclaimed admin account sitting around waiting to be taken.
 */
export async function promoteAction(_prev: AdminsState, formData: FormData): Promise<AdminsState> {
  const actor = await getStaffWith("admins.manage");
  if (!actor) return { error: "Only a super admin can manage admins." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "ADMIN") as Role;
  if (!email) return { error: "Enter the email of the account to promote." };
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return { error: "Choose a role." };

  return changeRole(actor.id, { email }, role);
}

/** Switch an admin between the two levels, or take their access away. */
export async function setRoleAction(_prev: AdminsState, formData: FormData): Promise<AdminsState> {
  const actor = await getStaffWith("admins.manage");
  if (!actor) return { error: "Only a super admin can manage admins." };

  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!ROLES.includes(role)) return { error: "Choose a role." };

  return changeRole(actor.id, { id: userId }, role);
}
