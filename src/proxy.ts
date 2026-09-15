import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Optimistic, cookie-only check: send someone with no session at all to log
// in. Which area a signed-in person belongs in is decided by the layouts,
// from the database, never here from the role inside the JWT — a token can
// outlive a role change, and routing by it bounced a demoted admin between
// /admin and /dashboard forever. Real authorization is enforced server-side
// in the layouts and in every server action and route handler
// (see src/lib/session.ts).
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const gated =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/checkout");

  if (gated && !req.auth) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/checkout/:path*"],
};
