// Rules about who may change whose account.
//
// Admin management is the one place where a wrong answer locks everybody out
// of the platform, so the rules live here as pure functions rather than as
// conditions scattered through server actions. Whether the actor may manage
// admins at all is a permission (see src/lib/permissions.ts); these rules
// decide whether this particular change is safe.

import { isStaff, type Role } from "./permissions";

export type { Role };
export type Status = "ACTIVE" | "SUSPENDED";

export type Guard = { ok: true } | { ok: false; reason: string };

const ALLOW: Guard = { ok: true };
const deny = (reason: string): Guard => ({ ok: false, reason });

/**
 * Whether `actor` may move `target` from their current role to `nextRole`.
 *
 * Three ways this goes wrong. Changing your own role loses you the console
 * mid-session (or quietly hands you more of it). Promoting a suspended account
 * creates an admin who cannot sign in, and un-suspends them by a side door.
 * And demoting the last super admin leaves nobody with the rights to appoint
 * another — a state no one left can undo.
 *
 * `superAdminCount` must be read in the same transaction as the write, or two
 * super admins demoting each other at once can both pass.
 */
export function canChangeRole(args: {
  actorId: string;
  targetId: string;
  targetRole: Role;
  targetStatus: Status;
  nextRole: Role;
  superAdminCount: number;
}): Guard {
  if (args.actorId === args.targetId) return deny("You cannot change your own role.");
  if (args.targetRole === args.nextRole) return deny("That account already has that role.");
  if (isStaff(args.nextRole) && args.targetStatus === "SUSPENDED") {
    return deny("Reactivate this account before giving it admin access.");
  }
  if (
    args.targetRole === "SUPER_ADMIN" &&
    args.nextRole !== "SUPER_ADMIN" &&
    args.superAdminCount <= 1
  ) {
    return deny("The last super admin cannot be demoted.");
  }
  return ALLOW;
}

/**
 * Whether `actor` may suspend or reactivate `target`.
 *
 * Suspending yourself is always a mistake; suspending a fellow admin of either
 * level is a demotion in disguise and has to go through a role change first.
 */
export function canSetUserStatus(args: {
  actorId: string;
  targetId: string;
  targetRole: Role;
}): Guard {
  if (args.actorId === args.targetId) return deny("You cannot suspend your own account.");
  if (isStaff(args.targetRole)) return deny("Remove admin access before suspending.");
  return ALLOW;
}
