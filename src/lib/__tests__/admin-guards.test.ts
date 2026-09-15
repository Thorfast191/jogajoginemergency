import { describe, it, expect } from "vitest";
import { canChangeRole, canSetUserStatus } from "../admin-guards";

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
