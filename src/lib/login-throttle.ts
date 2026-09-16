import { CredentialsSignin } from "next-auth";
import { checkLimit, recordHit } from "@/lib/rate-limit";

// Throttling is deliberately failure-only: a correct password costs a user
// nothing. The per-email bucket is the real defence (it follows the account an
// attacker is actually targeting); the per-IP bucket is a looser net for
// spraying across many accounts. It is loose on purpose — mobile carriers here
// NAT heavily, so a tight per-IP limit would lock out unrelated real users
// sharing one egress address.
//
// It lives in the credentials check itself, not in the login form's action:
// Auth.js serves its own sign-in endpoint (/api/auth/callback/credentials),
// and a limit only the form enforced was no limit at all — twelve wrong
// guesses there, then the right one, and the session was issued.

export const EMAIL_LIMIT = { limit: 5, windowMs: 15 * 60_000 };
export const IP_LIMIT = { limit: 30, windowMs: 15 * 60_000 };

/** Thrown from `authorize` so the login form can say "try later", not "wrong password". */
export class LoginThrottled extends CredentialsSignin {
  code = "throttled";
}

const keys = (email: string, ip: string) => ({
  email: `login-email:${email}`,
  ip: `login-ip:${ip}`,
});

export async function loginAllowed(email: string, ip: string): Promise<boolean> {
  const k = keys(email, ip);
  const [byEmail, byIp] = await Promise.all([checkLimit(k.email, EMAIL_LIMIT), checkLimit(k.ip, IP_LIMIT)]);
  return byEmail.allowed && byIp.allowed;
}

export async function recordFailedLogin(email: string, ip: string): Promise<void> {
  const k = keys(email, ip);
  await Promise.all([recordHit(k.email, EMAIL_LIMIT), recordHit(k.ip, IP_LIMIT)]);
}
