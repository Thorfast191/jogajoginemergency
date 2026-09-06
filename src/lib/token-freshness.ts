// A JWT session cannot be deleted server-side, so a password reset can't
// revoke outstanding tokens directly. Instead we stamp `User.passwordChangedAt`
// and reject any token minted before it — checked in `requireActiveUser`,
// which already reads the User row on every call.

/**
 * `issuedAtSeconds` is the token's own sign-in time (seconds since epoch,
 * matching the JWT `iat` convention). Returns true when the token predates the
 * account's last password change and must no longer be honoured.
 *
 * Fails closed: a token that cannot prove when it was issued is stale once a
 * password change has been recorded.
 */
export function isTokenStale(
  issuedAtSeconds: number | null | undefined,
  passwordChangedAt: Date | null | undefined,
): boolean {
  if (!passwordChangedAt) return false;
  if (typeof issuedAtSeconds !== "number" || !Number.isFinite(issuedAtSeconds)) return true;

  // Compare at second granularity in both directions. `iat` is floored to the
  // second, so a sign-in milliseconds after a reset would otherwise look older
  // than the reset and invalidate itself.
  const changedAtSeconds = Math.floor(passwordChangedAt.getTime() / 1000);
  return issuedAtSeconds < changedAtSeconds;
}
