import { describe, it, expect } from "vitest";
import { can, isStaff, roleLabel, type Permission } from "../permissions";

const SHARED: Permission[] = [
  "console.view",
  "users.manage",
  "orders.manage",
  "tags.manage",
  "catalog.edit",
  "plans.edit",
];

// The five things a regular admin must never be able to do.
const SUPER_ONLY: Permission[] = [
  "money.manage",
  "pricing.manage",
  "destructive",
  "admins.manage",
  "settings.manage",
];

describe("can", () => {
  it.each(SHARED)("lets both admin roles %s", (permission) => {
    expect(can("ADMIN", permission)).toBe(true);
    expect(can("SUPER_ADMIN", permission)).toBe(true);
  });

  it.each(SUPER_ONLY)("keeps %s for super admins only", (permission) => {
    expect(can("ADMIN", permission)).toBe(false);
    expect(can("SUPER_ADMIN", permission)).toBe(true);
  });

  it("gives a customer nothing in the console", () => {
    for (const permission of [...SHARED, ...SUPER_ONLY]) {
      expect(can("USER", permission)).toBe(false);
    }
  });

  // The role arrives from a JWT or a database row; anything unexpected must
  // fail closed rather than fall through to some default.
  it("gives an unknown or missing role nothing", () => {
    expect(can("OWNER", "console.view")).toBe(false);
    expect(can("", "console.view")).toBe(false);
    expect(can(undefined, "money.manage")).toBe(false);
    expect(can(null, "admins.manage")).toBe(false);
  });
});

describe("isStaff", () => {
  it("is true for both admin roles", () => {
    expect(isStaff("ADMIN")).toBe(true);
    expect(isStaff("SUPER_ADMIN")).toBe(true);
  });

  it("is false for customers and anything else", () => {
    expect(isStaff("USER")).toBe(false);
    expect(isStaff("admin")).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });
});

describe("roleLabel", () => {
  it("names each role for people", () => {
    expect(roleLabel("USER")).toBe("Customer");
    expect(roleLabel("ADMIN")).toBe("Admin");
    expect(roleLabel("SUPER_ADMIN")).toBe("Super admin");
  });
});
