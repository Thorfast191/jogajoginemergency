import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Optimistic, cookie-only checks. The real authorization is enforced
// server-side in the layouts and in every server action / route handler
// (see src/lib/session.ts). This just keeps users pointed at their own
// application area:
//   - unauthenticated        -> /login
//   - USER hitting /admin/*   -> /dashboard
//   - ADMIN hitting /dashboard/* -> /admin
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/admin")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (role === "ADMIN") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
