import { describe, it, expect } from "vitest";
import { canDemoteAdmin, canPromoteUser, canSetUserStatus } from "../admin-guards";

describe("canDemoteAdmin", () => {
  const base = { actorId: "a", targetId: "b", targetRole: "ADMIN" as const, adminCount: 3 };

  it("allows one admin to demote another while others remain", () => {
    expect(canDemoteAdmin(base).ok).toBe(true);
  });

  it("refuses self-demotion", () => {
    const r = canDemoteAdmin({ ...base, targetId: "a" });
    expect(r).toEqual({ ok: false, reason: "You cannot remove your own admin access." });
  });

  // The unrecoverable one: nobody left with rights to undo it.
  it("refuses to demote the last admin", () => {
    expect(canDemoteAdmin({ ...base, adminCount: 1 }).ok).toBe(false);
  });

  it("refuses a target who is not an admin", () => {
    expect(canDemoteAdmin({ ...base, targetRole: "USER" }).ok).toBe(false);
  });

  it("still refuses self-demotion even when other admins exist", () => {
    expect(canDemoteAdmin({ ...base, targetId: "a", adminCount: 9 }).ok).toBe(false);
  });
});

describe("canPromoteUser", () => {
  it("promotes an active customer", () => {
    expect(canPromoteUser({ targetRole: "USER", targetStatus: "ACTIVE" }).ok).toBe(true);
  });

  it("refuses someone who is already an admin", () => {
    expect(canPromoteUser({ targetRole: "ADMIN", targetStatus: "ACTIVE" }).ok).toBe(false);
  });

  it("refuses a suspended account rather than quietly reviving it", () => {
    expect(canPromoteUser({ targetRole: "USER", targetStatus: "SUSPENDED" }).ok).toBe(false);
  });
});

describe("canSetUserStatus", () => {
  it("allows suspending a customer", () => {
    expect(canSetUserStatus({ actorId: "a", targetId: "b", targetRole: "USER" }).ok).toBe(true);
  });

  it("refuses self-suspension", () => {
    expect(canSetUserStatus({ actorId: "a", targetId: "a", targetRole: "USER" }).ok).toBe(false);
  });

  it("refuses suspending an admin, which would be a demotion in disguise", () => {
    expect(canSetUserStatus({ actorId: "a", targetId: "b", targetRole: "ADMIN" }).ok).toBe(false);
  });
});
