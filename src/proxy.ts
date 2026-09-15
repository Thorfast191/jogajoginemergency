import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Optimistic, cookie-only checks. The real authorization is enforced
// server-side in the layouts and in every server action / route handler
// (see src/lib/session.ts). This just keeps users pointed at their own
// application area:
//   - unauthenticated on a gated route -> /login?next=<path>
//   - USER hitting /admin/*                -> /dashboard
//   - ADMIN hitting a customer-only area  -> /admin
export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  const loginRedirect = () => {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) return loginRedirect();
    if (role !== "ADMIN") return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const customerArea = pathname.startsWith("/dashboard") || pathname.startsWith("/checkout");

  if (customerArea) {
    if (!isLoggedIn) return loginRedirect();
    if (role === "ADMIN") return NextResponse.redirect(new URL("/admin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/checkout/:path*"],
};
