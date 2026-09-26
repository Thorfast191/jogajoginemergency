import { NextResponse } from "next/server";
import { adminOrigin, clientOrigin, publicOrigin } from "@/lib/hosts";

/**
 * Hand a visitor from one of our hostnames to another.
 *
 * A Server Action cannot redirect across origins: Next answers it through the
 * client router, which can only navigate within the app it is running in, so a
 * cross-origin `redirect()` leaves the browser sitting on the page it posted
 * from. Signing in on the main site and landing in the client area is exactly
 * that hop, so the action redirects here — same origin, so the router follows —
 * and this issues an ordinary 303 the browser obeys natively. It works with
 * JavaScript disabled, which a client-side `location.assign` would not.
 *
 * `to` is checked against the three origins this deployment actually serves.
 * Anything else is an open redirect — a phishing link that borrows our domain's
 * credibility to land someone on a page that isn't ours — so it goes to the
 * public site instead. The allow-list is exact origins, not a suffix match:
 * `jogajoginemergency.com.evil.test` ends with our domain and must not pass.
 */
export function GET(req: Request) {
  const to = new URL(req.url).searchParams.get("to");
  return NextResponse.redirect(safeTarget(to), 303);
}

function safeTarget(to: string | null): string {
  const allowed = [publicOrigin(), clientOrigin(), adminOrigin()];
  if (!to) return publicOrigin();

  let target: URL;
  try {
    target = new URL(to, publicOrigin());
  } catch {
    return publicOrigin();
  }

  return allowed.includes(target.origin) ? target.toString() : publicOrigin();
}
