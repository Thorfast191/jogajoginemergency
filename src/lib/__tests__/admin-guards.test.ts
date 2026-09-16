import { describe, it, expect } from "vitest";
import { canChangeRole, canSaveTheme, canSetTagStatus, canSetUserStatus } from "../admin-guards";

describe("canChangeRole", () => {
  const base = {
    actorId: "a",
    targetId: "b",
    targetRole: "ADMIN" as const,
    targetStatus: "ACTIVE" as const,
    nextRole: "USER" as const,
    superAdminCount: 2,
  };

  it("lets a super admin remove a regular admin", () => {
    expect(canChangeRole(base).ok).toBe(true);
  });

  it("promotes an active customer to admin or straight to super admin", () => {
    const customer = { ...base, targetRole: "USER" as const };
    expect(canChangeRole({ ...customer, nextRole: "ADMIN" }).ok).toBe(true);
    expect(canChangeRole({ ...customer, nextRole: "SUPER_ADMIN" }).ok).toBe(true);
  });

  it("refuses any change to your own role", () => {
    const r = canChangeRole({ ...base, targetId: "a", targetRole: "SUPER_ADMIN", nextRole: "ADMIN" });
    expect(r).toEqual({ ok: false, reason: "You cannot change your own role." });
  });

  it("refuses a change that changes nothing", () => {
    expect(canChangeRole({ ...base, nextRole: "ADMIN" }).ok).toBe(false);
  });

  it("refuses to give admin access to a suspended account", () => {
    const suspended = { ...base, targetRole: "USER" as const, targetStatus: "SUSPENDED" as const };
    expect(canChangeRole({ ...suspended, nextRole: "ADMIN" }).ok).toBe(false);
    expect(canChangeRole({ ...suspended, nextRole: "SUPER_ADMIN" }).ok).toBe(false);
  });

  // The unrecoverable one: nobody would be left with the rights to undo it.
  it("refuses to demote the last super admin, to either lower role", () => {
    const last = { ...base, targetRole: "SUPER_ADMIN" as const, superAdminCount: 1 };
    expect(canChangeRole({ ...last, nextRole: "ADMIN" })).toEqual({
      ok: false,
      reason: "The last super admin cannot be demoted.",
    });
    expect(canChangeRole({ ...last, nextRole: "USER" }).ok).toBe(false);
  });

  it("lets one super admin demote another while one remains", () => {
    const other = { ...base, targetRole: "SUPER_ADMIN" as const, superAdminCount: 2 };
    expect(canChangeRole({ ...other, nextRole: "ADMIN" }).ok).toBe(true);
  });
});

describe("canSaveTheme", () => {
  const base = {
    isDefault: false,
    mayArchive: true,
    existingSlug: "night-guardian",
    nextSlug: "night-guardian",
    existingStatus: "ACTIVE",
    nextStatus: "ACTIVE",
  };

  it("allows ordinary edits", () => {
    expect(canSaveTheme(base).ok).toBe(true);
    expect(canSaveTheme({ ...base, nextSlug: "renamed" }).ok).toBe(true);
    expect(canSaveTheme({ ...base, nextStatus: "DRAFT" }).ok).toBe(true);
  });

  // The edit form has a status select; saving it must not walk around the
  // archive button's permission.
  it("refuses archiving without the destructive permission", () => {
    expect(canSaveTheme({ ...base, mayArchive: false, nextStatus: "ARCHIVED" }).ok).toBe(false);
  });

  it("refuses un-archiving without it either", () => {
    const back = { ...base, mayArchive: false, existingStatus: "ARCHIVED", nextStatus: "ACTIVE" };
    expect(canSaveTheme(back).ok).toBe(false);
  });

  it("allows a super admin to archive and to bring one back", () => {
    expect(canSaveTheme({ ...base, nextStatus: "ARCHIVED" }).ok).toBe(true);
    expect(canSaveTheme({ ...base, existingStatus: "ARCHIVED", nextStatus: "ACTIVE" }).ok).toBe(true);
  });

  // Every account falls back to the default theme, and the code finds it by slug.
  it("never lets the default theme be archived or renamed", () => {
    const def = { ...base, isDefault: true, existingSlug: "jogajog-emergency", nextSlug: "jogajog-emergency" };
    expect(canSaveTheme({ ...def, nextStatus: "ARCHIVED" }).ok).toBe(false);
    expect(canSaveTheme({ ...def, nextSlug: "something-else" }).ok).toBe(false);
    expect(canSaveTheme(def).ok).toBe(true);
  });
});

describe("canSetUserStatus", () => {
  it("allows suspending a customer", () => {
    expect(canSetUserStatus({ actorId: "a", targetId: "b", targetRole: "USER" }).ok).toBe(true);
  });

  it("refuses self-suspension", () => {
    expect(canSetUserStatus({ actorId: "a", targetId: "a", targetRole: "USER" }).ok).toBe(false);
  });

  it("refuses suspending any staff account, which would be a demotion in disguise", () => {
    expect(canSetUserStatus({ actorId: "a", targetId: "b", targetRole: "ADMIN" }).ok).toBe(false);
    expect(canSetUserStatus({ actorId: "a", targetId: "b", targetRole: "SUPER_ADMIN" }).ok).toBe(
      false,
    );
  });
});

describe("canSetTagStatus", () => {
  const owner = { by: "owner" as const, mayTakeDown: false };
  const admin = { by: "staff" as const, mayTakeDown: false };
  const superAdmin = { by: "staff" as const, mayTakeDown: true };

  describe("the owner", () => {
    it("can mark their QR lost, turn it off and back on", () => {
      expect(canSetTagStatus({ ...owner, current: "ACTIVE", takenDown: false, next: "LOST" })).toEqual({ ok: true, takenDown: false });
      expect(canSetTagStatus({ ...owner, current: "ACTIVE", takenDown: false, next: "DEACTIVATED" })).toEqual({ ok: true, takenDown: false });
      expect(canSetTagStatus({ ...owner, current: "DEACTIVATED", takenDown: false, next: "ACTIVE" })).toEqual({ ok: true, takenDown: false });
    });

    it("cannot undo a takedown", () => {
      // The bug: the owner's own tag form put an abuse takedown straight back up.
      for (const next of ["ACTIVE", "LOST"] as const) {
        const r = canSetTagStatus({ ...owner, current: "DEACTIVATED", takenDown: true, next });
        expect(r.ok).toBe(false);
      }
    });

    it("can still rename a taken-down QR without touching its status", () => {
      expect(canSetTagStatus({ ...owner, current: "DEACTIVATED", takenDown: true, next: "DEACTIVATED" })).toEqual({ ok: true, takenDown: true });
    });
  });

  describe("staff", () => {
    it("a super admin's deactivation is a takedown", () => {
      expect(canSetTagStatus({ ...superAdmin, current: "ACTIVE", takenDown: false, next: "DEACTIVATED" })).toEqual({ ok: true, takenDown: true });
    });

    it("a super admin can take down a QR the owner had already turned off", () => {
      // Otherwise an owner could dodge a takedown by switching the QR off
      // first and back on once the report is closed.
      expect(canSetTagStatus({ ...superAdmin, current: "DEACTIVATED", takenDown: false, next: "DEACTIVATED" })).toEqual({ ok: true, takenDown: true });
    });

    it("a super admin can lift their own takedown", () => {
      expect(canSetTagStatus({ ...superAdmin, current: "DEACTIVATED", takenDown: true, next: "ACTIVE" })).toEqual({ ok: true, takenDown: false });
    });

    it("nobody on staff can switch on a QR its owner turned off", () => {
      // That would publish someone's page against their wishes.
      const r = canSetTagStatus({ ...superAdmin, current: "DEACTIVATED", takenDown: false, next: "ACTIVE" });
      expect(r.ok).toBe(false);
    });

    it("an admin cannot take down or lift a takedown", () => {
      expect(canSetTagStatus({ ...admin, current: "ACTIVE", takenDown: false, next: "DEACTIVATED" }).ok).toBe(false);
      expect(canSetTagStatus({ ...admin, current: "DEACTIVATED", takenDown: true, next: "ACTIVE" }).ok).toBe(false);
    });

    it("an admin can move a live QR between active and lost", () => {
      expect(canSetTagStatus({ ...admin, current: "ACTIVE", takenDown: false, next: "LOST" })).toEqual({ ok: true, takenDown: false });
      expect(canSetTagStatus({ ...admin, current: "LOST", takenDown: false, next: "ACTIVE" })).toEqual({ ok: true, takenDown: false });
    });
  });
});
