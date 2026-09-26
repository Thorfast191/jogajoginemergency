// Three audiences, three hostnames.
//
//   jogajoginemergency.com          the public site, the shop, and every scan
//                                   page — the origin QR codes are printed with
//   client.jogajoginemergency.com   the customer's own area
//   admin.jogajoginemergency.com    the console
//
// Separating them is worth doing for one reason above the tidiness: a console
// on its own hostname can be put behind network rules — a WAF policy, an IP
// allow-list, an identity proxy — without any of that touching the scan page a
// stranger has to reach at 2am with a found helmet.
//
// One deployment serves all three. `src/proxy.ts` decides, per request, which
// area a hostname is and refuses paths that belong to another; the helpers here
// build links that cross between them.
//
// A single-host deployment (every local dev machine, and any install that never
// sets the subdomain variables) collapses to the behaviour this app had before:
// all three origins are equal, so every helper returns a plain path and nothing
// has to know about hosts at all.

export type Area = "public" | "client" | "admin";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

/** Trailing slashes make `${origin}${path}` produce doubled separators. */
function clean(url: string): string {
  return url.replace(/\/+$/, "");
}

/** The public site: what `NEXT_PUBLIC_APP_URL` has always meant. */
export function publicOrigin(): string {
  return clean(env("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000");
}

export function clientOrigin(): string {
  return clean(env("NEXT_PUBLIC_CLIENT_URL") ?? publicOrigin());
}

export function adminOrigin(): string {
  return clean(env("NEXT_PUBLIC_ADMIN_URL") ?? publicOrigin());
}

export function originFor(area: Area): string {
  if (area === "client") return clientOrigin();
  if (area === "admin") return adminOrigin();
  return publicOrigin();
}

/**
 * Whether this deployment actually splits the areas across hostnames.
 *
 * When it doesn't, every link helper below returns a path, which is what keeps
 * `npm run dev` on one port working exactly as before.
 */
export function areasAreSplit(): boolean {
  return clientOrigin() !== publicOrigin() || adminOrigin() !== publicOrigin();
}

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Which area a request's Host header belongs to.
 *
 * Unknown hosts are "public": an IP address, a health check, a preview URL or a
 * misconfigured DNS record should land on the marketing site, never on someone's
 * console. The port is ignored so `client.localhost:3005` works for testing.
 */
export function areaForHost(host: string | null | undefined): Area {
  if (!host) return "public";
  const name = host.split(":")[0]!.toLowerCase();
  if (!areasAreSplit()) return "public";
  if (name === hostnameOf(adminOrigin())) return "admin";
  if (name === hostnameOf(clientOrigin())) return "client";
  return "public";
}

/**
 * A link to `path` in `area`: absolute when the areas live on different hosts,
 * a plain path when they don't.
 *
 * Absolute would be correct either way; the plain path is what keeps a
 * single-host install (and every dev machine) free of hardcoded ports.
 */
export function hrefIn(area: Area, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return areasAreSplit() ? `${originFor(area)}${p}` : p;
}

export const publicHref = (path: string) => hrefIn("public", path);
export const clientHref = (path: string) => hrefIn("client", path);
export const adminHref = (path: string) => hrefIn("admin", path);

/**
 * A redirect target for a place that *can* redirect across origins — a Route
 * Handler, or Auth.js's own sign-out — but only via our own origin.
 *
 * Server Actions cannot: see src/app/continue/route.ts and LoginState.go.
 */
export function handoff(target: string): string {
  if (!target.startsWith("http")) return target;
  return `/continue?to=${encodeURIComponent(target)}`;
}

/** Where a signed-in person belongs, by role. */
export function homeForRole(role: string | null | undefined): string {
  return role === "ADMIN" || role === "SUPER_ADMIN" ? adminHref("/admin") : clientHref("/dashboard");
}

// --- What each host is allowed to serve -----------------------------------

/** Paths every area needs: auth, APIs, authorized media, and the error pages. */
const SHARED_PREFIXES = [
  "/api/",
  "/media/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

/**
 * Whether `pathname` is one this area serves.
 *
 * Each area owns its own prefix and the shared ones. Everything else is a link
 * into another area, and the proxy sends it there rather than rendering it —
 * so a customer's bookmark of the old `/dashboard` URL on the main site still
 * lands where they expect, on the client host.
 */
export function pathBelongsTo(area: Area, pathname: string): boolean {
  // One host serves everything. Without this the proxy would find /dashboard
  // "foreign" to the only area there is and redirect it to itself, forever.
  if (!areasAreSplit()) return true;
  if (SHARED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) return true;
  if (area === "client") return pathname.startsWith("/dashboard");
  if (area === "admin") return pathname.startsWith("/admin");
  return !pathname.startsWith("/dashboard") && !pathname.startsWith("/admin");
}

/** The area a path lives in, for sending a stray request to the right host. */
export function areaForPath(pathname: string): Area {
  if (pathname.startsWith("/dashboard")) return "client";
  if (pathname.startsWith("/admin")) return "admin";
  return "public";
}

/** Where a bare visit to a subdomain root should land. */
export function landingPathFor(area: Area): string {
  if (area === "client") return "/dashboard";
  if (area === "admin") return "/admin";
  return "/";
}
