import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  areaForHost,
  areaForPath,
  areasAreSplit,
  hrefIn,
  landingPathFor,
  originFor,
  pathBelongsTo,
} from "@/lib/hosts";

// Two jobs, in this order.
//
// 1. Put the request on the right host. The public site, the customer area and
//    the console are three hostnames served by one deployment (see
//    src/lib/hosts.ts), so a path that belongs to another area is redirected
//    there rather than rendered here. Old bookmarks of /dashboard on the main
//    domain keep working, and the console is not reachable at all from the
//    address a stranger scans a sticker with.
//
// 2. Send someone with no session at all to log in. This is an optimistic,
//    cookie-only check. Which area a signed-in person belongs in is decided by
//    the layouts, from the database, never here from the role inside the JWT —
//    a token can outlive a role change, and routing by it bounced a demoted
//    admin between /admin and /dashboard forever. Real authorization is
//    enforced server-side in the layouts and in every server action and route
//    handler (see src/lib/session.ts).
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const area = areaForHost(req.headers.get("host"));

  // `req.url` is the origin this server believes it is, which behind a proxy —
  // Cloudflare, nginx, anything — is not the origin the browser asked for.
  // Redirecting with it silently moved every subdomain visitor onto the main
  // domain. Every redirect below is built from the area's own configured
  // origin instead, and falls back to a plain path on a single-host install.
  const here = (path: string) => (areasAreSplit() ? `${originFor(area)}${path}` : path);

  // A bare visit to client. or admin. lands in that area rather than on an
  // empty marketing page served from the wrong hostname.
  if (pathname === "/" && area !== "public") {
    return NextResponse.redirect(new URL(here(landingPathFor(area) + search), req.url));
  }

  if (!pathBelongsTo(area, pathname)) {
    const target = hrefIn(areaForPath(pathname), pathname + search);
    // Never bounce a request to the address it already has: a misconfigured
    // pair of origins must degrade to serving the page, not to a loop.
    if (target.startsWith("http")) return NextResponse.redirect(target);
  }

  const gated =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/checkout");

  if (gated && !req.auth) {
    // Signing in stays on the host the visitor is already on — every area
    // serves /login, and the session cookie spans all three. Where they go
    // afterwards is decided by role, in the login action.
    const next = encodeURIComponent(pathname + search);
    return NextResponse.redirect(new URL(here(`/login?next=${next}`), req.url));
  }

  const res = NextResponse.next();
  // Neither private area belongs in an index. The scan pages set this for
  // themselves; here it covers every page the console and the client area have.
  if (area !== "public") res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
});

export const config = {
  // Everything except Next's own build output and the files served from
  // /public — host routing has to see the whole site, not just the gated
  // paths, or a request for /shop on the console's hostname would render it.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
