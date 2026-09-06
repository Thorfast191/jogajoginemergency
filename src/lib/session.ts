import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isTokenStale } from "@/lib/token-freshness";

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
    },
  });
  if (!user || user.status !== "ACTIVE") return null;

  // A password reset can't delete an outstanding JWT, so honour it here
  // instead: any token minted before the reset stops working immediately.
  const { passwordChangedAt, ...authed } = user;
  if (isTokenStale(session.user.authAt, passwordChangedAt)) return null;

  return authed;
}

export type AuthedUser = NonNullable<Awaited<ReturnType<typeof requireActiveUser>>>;

// --- Admin (platform authority) -------------------------------------------
// Admin access is role-based and never depends on a customer subscription.

/** Returns the active ADMIN, or null. Use in pages/layouts that redirect. */
export async function getAdmin() {
  const user = await requireActiveUser();
  return user && user.role === "ADMIN" ? user : null;
}

/** Returns the active ADMIN, or throws. Use in mutating server actions. */
export async function requireAdmin(): Promise<AuthedUser> {
  const admin = await getAdmin();
  if (!admin) throw new Error("Forbidden: admin access required.");
  return admin;
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
