// Who may do what in the console — the only place a role is interpreted.
//
// Two staff roles. A regular ADMIN runs the day-to-day platform: customers,
// orders, subscriptions, monitoring, the QR codes customers generated and the
// catalogue's content. A SUPER_ADMIN additionally holds the five things that
// move money, change prices, destroy something, or change who the admins are.
//
// Pages, nav links, buttons and server actions all ask `can`. Hiding a button
// is a courtesy; the server action checking `can` is the guarantee.

export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";

export type Permission =
  /** Overview (without revenue), scan activity, abuse reports, own profile. */
  | "console.view"
  /** List and search customers, correct a customer's name or email. */
  | "users.manage"
  /** List orders, move fulfilment, print files, replacement QR, reminders. */
  | "orders.manage"
  /** List and search QR codes, sticker downloads, mark lost or active. */
  | "tags.manage"
  /** Product and theme content: text, images, artwork, QR square, sticker size. */
  | "catalog.edit"
  /** A plan's name and features text. */
  | "plans.edit"
  /** Payments, revenue, order paid/cancel/refund, grant/extend/cancel plans. */
  | "money.manage"
  /** Create products, set prices and QR slots, publish; create and price plans. */
  | "pricing.manage"
  /** Archive products and themes, deactivate a QR, suspend or reactivate users. */
  | "destructive"
  /** Promote, demote, and switch between admin and super admin. */
  | "admins.manage"
  /** Platform settings, the activity log, maintenance. */
  | "settings.manage";

const SHARED: readonly Permission[] = [
  "console.view",
  "users.manage",
  "orders.manage",
  "tags.manage",
  "catalog.edit",
  "plans.edit",
];

const SUPER_ONLY: readonly Permission[] = [
  "money.manage",
  "pricing.manage",
  "destructive",
  "admins.manage",
  "settings.manage",
];

const TABLE: Record<Role, ReadonlySet<Permission>> = {
  USER: new Set(),
  ADMIN: new Set(SHARED),
  SUPER_ADMIN: new Set([...SHARED, ...SUPER_ONLY]),
};

function known(role: string | null | undefined): role is Role {
  return role === "USER" || role === "ADMIN" || role === "SUPER_ADMIN";
}

/** Whether this role may do this. Unknown or missing roles may do nothing. */
export function can(role: string | null | undefined, permission: Permission): boolean {
  return known(role) && TABLE[role].has(permission);
}

/** Either admin role — the people the console exists for. */
export function isStaff(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function roleLabel(role: string): string {
  if (role === "SUPER_ADMIN") return "Super admin";
  if (role === "ADMIN") return "Admin";
  return "Customer";
}
