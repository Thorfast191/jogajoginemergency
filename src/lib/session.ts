import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTokenStale, latest } from "@/lib/token-freshness";
import { can, isStaff, type Permission } from "@/lib/permissions";

// Session JWTs are only checked against `User.status` at sign-in. Without
// this, an admin suspending a user has no effect until that user's token
// expires. Every mutating action (and the dashboard/admin layouts) should
// call one of the helpers below instead of reading `session.user` directly.
export async function requireActiveUser() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      passwordChangedAt: true,
      roleChangedAt: true,
    },
  });
  if (!user || user.status !== "ACTIVE") return null;

  // A JWT can't be deleted, so revocation is honoured here instead: a token
  // minted before the last password change or role change stops working
  // immediately. The role change matters because the token carries the role —
  // a demoted admin would otherwise keep being routed to the console by the
  // proxy while the layouts refused them, and bounce between the two.
  const { passwordChangedAt, roleChangedAt, ...authed } = user;
  if (isTokenStale(session.user.authAt, latest(passwordChangedAt, roleChangedAt))) return null;

  return authed;
}

export type AuthedUser = NonNullable<Awaited<ReturnType<typeof requireActiveUser>>>;

// --- Staff (platform authority) -------------------------------------------
// Staff access is role-based and never depends on a customer subscription.
// What each staff role may do is src/lib/permissions.ts.

/** Returns the active admin of either level, or null. Use in layouts that redirect. */
export async function getAdmin() {
  const user = await requireActiveUser();
  return user && isStaff(user.role) ? user : null;
}

/**
 * Returns the active staff member if their role grants `permission`, or null.
 *
 * The console's one way in: pages render <Forbidden /> on null and server
 * actions return a sentence. Deliberately not a throwing variant — a staff
 * member whose role was narrowed mid-session should read why, not trip an
 * error overlay.
 */
export async function getStaffWith(permission: Permission) {
  const user = await requireActiveUser();
  return user && can(user.role, permission) ? user : null;
}

// --- Customer (subscription-based product user) --------------------------
// Customer access is role-based here; entitlement (how many tags, etc.) is
// enforced separately against the customer's active subscription.

/** Returns the active USER, or null. Use in pages/layouts that redirect. */
export async function getCustomer() {
  const user = await requireActiveUser();
  return user && user.role === "USER" ? user : null;
}

/** Returns the active USER, or throws. Use in mutating server actions. */
export async function requireCustomer(): Promise<AuthedUser> {
  const customer = await getCustomer();
  if (!customer) throw new Error("Forbidden: customer access required.");
  return customer;
}
