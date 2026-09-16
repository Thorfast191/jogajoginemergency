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
 * Whether a theme may be saved with these values.
 *
 * Archiving a theme hides it from the store and the picker, which is why it has
 * its own destructive-permission button — but the edit form also carries a
 * status select and a slug field, and saving the form must not become a way
 * around that button. The default theme is protected twice over: it is what
 * every account falls back to, and `DEFAULT_THEME_SLUG` is how the code finds
 * it, so renaming it would quietly leave customers with no theme at all.
 */
export function canSaveTheme(args: {
  isDefault: boolean;
  /** The actor holds `destructive`. */
  mayArchive: boolean;
  existingSlug: string;
  nextSlug: string;
  existingStatus: string;
  nextStatus: string;
}): Guard {
  if (args.isDefault && args.nextSlug !== args.existingSlug) {
    return deny("The default theme's slug cannot change.");
  }

  const touchesArchive =
    args.nextStatus !== args.existingStatus &&
    (args.nextStatus === "ARCHIVED" || args.existingStatus === "ARCHIVED");
  if (touchesArchive) {
    if (args.isDefault) {
      return deny("The default theme cannot be archived — every account falls back to it.");
    }
    if (!args.mayArchive) {
      return deny("Only a super admin can archive a theme, or bring one back.");
    }
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

export type TagStatus = "ACTIVE" | "LOST" | "DEACTIVATED";
export type TagStatusChange = { ok: true; takenDown: boolean } | { ok: false; reason: string };

/**
 * Whether a QR code's status may change, and whether it is a takedown after.
 *
 * DEACTIVATED means two different things. An owner switching their own code
 * off is theirs to switch back on. A super admin taking one down — an abuse
 * report, a court order — is not the owner's to undo, which is what
 * `Tag.takenDownAt` records. And the reverse: no one on staff may switch on a
 * code its owner turned off, because that publishes their page for them.
 */
export function canSetTagStatus(args: {
  by: "owner" | "staff";
  /** Staff only: holds `destructive`. */
  mayTakeDown: boolean;
  current: TagStatus;
  takenDown: boolean;
  next: TagStatus;
}): TagStatusChange {
  const { by, mayTakeDown, current, takenDown, next } = args;
  const refuse = (reason: string): TagStatusChange => ({ ok: false, reason });

  if (by === "owner") {
    if (!takenDown) return { ok: true, takenDown: false };
    if (next === current) return { ok: true, takenDown: true };
    return refuse(
      "This QR code was taken down by our team, so its status can't be changed here. Contact us if you think that's a mistake.",
    );
  }

  if (next === "DEACTIVATED") {
    if (!mayTakeDown) return refuse("Only a super admin can take a QR code down.");
    return { ok: true, takenDown: true };
  }
  if (current === "DEACTIVATED") {
    if (!takenDown) {
      return refuse("The owner turned this QR code off. Only they can turn it back on.");
    }
    if (!mayTakeDown) return refuse("Only a super admin can lift a takedown.");
    return { ok: true, takenDown: false };
  }
  return { ok: true, takenDown: false };
}
