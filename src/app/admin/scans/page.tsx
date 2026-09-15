import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { summarizeUserAgent } from "@/lib/user-agent";

export const dynamic = "force-dynamic";

// Kept out of the component body so the render stays free of impure calls.
function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export default async function AdminScansPage() {
  if (!(await getAdmin())) redirect("/dashboard");

  const cutoff24h = hoursAgo(24);
  const [scans, total, last24h] = await Promise.all([
    prisma.scanEvent.findMany({
      include: {
        tag: {
          select: {
            shortCode: true,
            status: true,
            user: { select: { name: true, email: true } },
            _count: { select: { scanEvents: true } },
          },
        },
      },
      orderBy: { scannedAt: "desc" },
      take: 200,
    }),
    prisma.scanEvent.count(),
    prisma.scanEvent.count({ where: { scannedAt: { gte: cutoff24h } } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Scan Activity</h1>
      <p className="mt-1 text-sm text-black/60">
        Recent public scans of platform tags. Scanner IPs are never stored — only a salted hash
        is kept, so locations shown here are coarse and best-effort.
      </p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-xs text-black/50">Total scans</p>
          <p className="mt-1 text-2xl font-semibold">{total}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-xs text-black/50">Last 24 hours</p>
          <p className="mt-1 text-2xl font-semibold">{last24h}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">Tag</th>
              <th className="py-3 px-4">Owner</th>
              <th className="py-3 px-4">Scanned at</th>
              <th className="py-3 px-4">Approx. location</th>
              <th className="py-3 px-4">Device</th>
              <th className="py-3 px-4">Tag scans</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan) => (
              <tr key={scan.id} className="border-b border-black/5 last:border-b-0 align-top">
                <td className="py-3 px-4 font-mono">{scan.tag.shortCode}</td>
                <td className="py-3 px-4">
                  {scan.tag.user.name}
                  <div className="text-xs text-black/40">{scan.tag.user.email}</div>
                </td>
                <td className="py-3 px-4">{scan.scannedAt.toLocaleString()}</td>
                <td className="py-3 px-4">
                  {[scan.approxCity, scan.approxRegion, scan.approxCountry].filter(Boolean).join(", ") ||
                    "Unknown"}
                </td>
                <td className="py-3 px-4">{summarizeUserAgent(scan.userAgent)}</td>
                <td className="py-3 px-4">{scan.tag._count.scanEvents}</td>
              </tr>
            ))}
            {scans.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 px-4 text-center text-sm text-black/50">
                  No scans recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
