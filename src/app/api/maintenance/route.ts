import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runMaintenance } from "@/lib/maintenance";

// Periodic housekeeping, meant to be called by cron or a systemd timer:
//
//   curl -H "Authorization: Bearer $MAINTENANCE_SECRET" https://…/api/maintenance
//
// The work itself is src/lib/maintenance.ts, which a super admin can also run
// from platform settings.

function authorized(req: Request): boolean {
  const secret = process.env.MAINTENANCE_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";

  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  // Compare in constant time, and only when the lengths already match —
  // timingSafeEqual throws on a length mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  return run(req);
}

export async function GET(req: Request) {
  return run(req);
}

async function run(req: Request): Promise<Response> {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...(await runMaintenance()) });
}
