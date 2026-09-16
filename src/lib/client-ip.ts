import { headers } from "next/headers";

// Who is calling — used for rate-limit buckets and for the salted hash stored
// against a scan.
//
// `X-Forwarded-For` is a list the caller can start: anything to the left of
// what your own proxy appended is unverified. Taking the leftmost entry (the
// obvious reading) lets anyone mint a fresh rate-limit bucket per request by
// making one up, which defeats the login, signup, relay, abuse and scan
// limits. So the address is counted from the *right*: with one trusted proxy
// in front, the last entry is the one that proxy actually saw.
//
// TRUSTED_PROXY_HOPS says how many proxies sit in front of the app (nginx,
// Cloudflare, a load balancer). Set it to 0 to ignore forwarding headers
// altogether — correct when nothing is in front, where the header can only be
// the caller's own claim.

export type ForwardHeaders = { forwardedFor: string | null; realIp: string | null };

export const UNKNOWN_IP = "unknown";

/** How many proxies to believe. Anything unparseable means the documented one. */
export function trustedHops(env: Record<string, string | undefined>): number {
  const raw = env.TRUSTED_PROXY_HOPS?.trim();
  if (raw === undefined || raw === "") return 1;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 ? n : 1;
}

/** The caller's address, as far as the trusted proxies can vouch for it. */
export function clientIpFrom({ forwardedFor, realIp }: ForwardHeaders, hops: number): string {
  if (hops <= 0) return UNKNOWN_IP;

  const chain = (forwardedFor ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (chain.length > 0) {
    // One hop back per trusted proxy, never past the start of the chain.
    return chain[Math.max(0, chain.length - hops)];
  }

  const real = realIp?.trim();
  return real || UNKNOWN_IP;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return clientIpFrom(
    { forwardedFor: h.get("x-forwarded-for"), realIp: h.get("x-real-ip") },
    trustedHops(process.env),
  );
}
