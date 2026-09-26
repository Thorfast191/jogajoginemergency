import { adminOrigin, clientOrigin, publicOrigin } from "@/lib/hosts";

/**
 * The domain a session cookie must be issued for so all three hostnames share
 * one sign-in — or null when there is nothing to share.
 *
 * Returns the longest suffix common to the three origins, as a leading-dot
 * domain: `jogajoginemergency.com` for the three production hosts. Null when
 * the areas are not split (one host, the browser's default scoping is right),
 * and null for anything that isn't a real registrable-looking domain — a bare
 * IP or `localhost` cannot carry a Domain attribute, and a cookie set for a
 * suffix as short as `com` would be rejected anyway.
 */
export function sessionCookieDomain(
  origins: string[] = [publicOrigin(), clientOrigin(), adminOrigin()],
): string | null {
  const hosts = origins.map(hostnameOf).filter((h): h is string => !!h);
  if (hosts.length !== origins.length) return null;

  const unique = new Set(hosts);
  if (unique.size < 2) return null;

  const common = longestCommonSuffix([...unique].map((h) => h.split(".")));
  // "com" is a public suffix; a cookie needs at least name.tld to be accepted.
  if (common.length < 2) return null;
  if (common.some((label) => label === "")) return null;

  return common.join(".");
}

function hostnameOf(url: string): string | null {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  // An IP address or a single-label host has no parent domain to share with.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;
  if (hostname.startsWith("[")) return null;
  if (!hostname.includes(".")) return null;
  return hostname;
}

function longestCommonSuffix(labelLists: string[][]): string[] {
  const reversed = labelLists.map((l) => [...l].reverse());
  const shortest = Math.min(...reversed.map((l) => l.length));
  const out: string[] = [];
  for (let i = 0; i < shortest; i++) {
    const label = reversed[0]![i]!;
    if (!reversed.every((l) => l[i] === label)) break;
    out.push(label);
  }
  return out.reverse();
}
