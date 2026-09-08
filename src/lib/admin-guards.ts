// Rules about who may change whose account.
//
// Admin management is the one place where a wrong answer locks everybody out
// of the platform, so the rules live here as pure functions rather than as
// conditions scattered through server actions.

export type Role = "USER" | "ADMIN";
export type Status = "ACTIVE" | "SUSPENDED";

export type Guard = { ok: true } | { ok: false; reason: string };

const ALLOW: Guard = { ok: true };
const deny = (reason: string): Guard => ({ ok: false, reason });

/**
 * Whether `actor` may take admin rights away from `target`.
 *
 * Two ways this goes wrong: an admin demotes themselves and loses the console
 * mid-session, or the last admin is demoted and nobody can ever administer the
 * platform again — a state no one left has the rights to undo.
 */
export function canDemoteAdmin(args: {
  actorId: string;
  targetId: string;
  targetRole: Role;
  adminCount: number;
}): Guard {
  if (args.targetRole !== "ADMIN") return deny("That account is not an admin.");
  if (args.actorId === args.targetId) return deny("You cannot remove your own admin access.");
  if (args.adminCount <= 1) return deny("The last admin cannot be demoted.");
  return ALLOW;
}

/** Whether `target` may be given admin rights. */
export function canPromoteUser(args: { targetRole: Role; targetStatus: Status }): Guard {
  if (args.targetRole === "ADMIN") return deny("That account is already an admin.");
  // Promoting a suspended account would create an admin who cannot sign in,
  // and un-suspends them by a side door.
  if (args.targetStatus === "SUSPENDED") {
    return deny("Reactivate this account before making it an admin.");
  }
  return ALLOW;
}

/**
 * Whether `actor` may suspend or reactivate `target`.
 *
 * Suspending yourself is always a mistake; suspending a fellow admin is a
 * demotion in disguise and has to go through canDemoteAdmin first.
 */
export function canSetUserStatus(args: {
  actorId: string;
  targetId: string;
  targetRole: Role;
}): Guard {
  if (args.actorId === args.targetId) return deny("You cannot suspend your own account.");
  if (args.targetRole === "ADMIN") return deny("Remove admin access before suspending.");
  return ALLOW;
}
