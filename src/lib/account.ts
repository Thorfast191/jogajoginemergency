import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Self-service account changes, shared by the customer settings page and the
// admin profile page so both get the same rules — in particular the session
// invalidation on a password change, which only the reset flow used to do.

export type AccountResult = { ok: true } | { ok: false; error: string };

/**
 * Change a user's own password, having proved they know the current one.
 *
 * Stamps `passwordChangedAt`, which makes every JWT minted before this moment
 * stale (see src/lib/token-freshness.ts). Someone changing their password
 * because they think they have been compromised expects the other device to be
 * signed out; without the stamp it stays signed in until the token expires.
 */
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<AccountResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true },
  });
  if (!user) return { ok: false, error: "User not found." };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "Current password is incorrect." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(newPassword, 10),
      passwordChangedAt: new Date(),
    },
  });
  return { ok: true };
}

/**
 * Change a user's own name and email.
 *
 * The email is the sign-in identifier, so a collision is reported rather than
 * left to the database's unique constraint.
 */
export async function changeOwnIdentity(
  userId: string,
  name: string,
  email: string,
): Promise<AccountResult> {
  const normalized = email.trim().toLowerCase();

  const clash = await prisma.user.findFirst({
    where: { email: normalized, NOT: { id: userId } },
    select: { id: true },
  });
  if (clash) return { ok: false, error: "Another account already uses that email." };

  await prisma.user.update({ where: { id: userId }, data: { name: name.trim(), email: normalized } });
  return { ok: true };
}
