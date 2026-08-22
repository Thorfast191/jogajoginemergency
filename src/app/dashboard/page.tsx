import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [subscription, tags, recentScans] = await Promise.all([
    prisma.subscription.findFirst({
      where: { userId, status: "ACTIVE" },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tag.findMany({ where: { userId }, include: { item: true } }),
    prisma.scanEvent.findMany({
      where: { tag: { userId } },
      include: { tag: { include: { item: true } } },
      orderBy: { scannedAt: "desc" },
      take: 5,
    }),
  ]);

  const activeTags = tags.filter((t) => t.status === "ACTIVE").length;
  const lostTags = tags.filter((t) => t.status === "LOST").length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}</h1>

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-sm text-black/60">Plan</p>
          <p className="mt-1 text-lg font-semibold">{subscription?.plan.name ?? "No active plan"}</p>
          {subscription && (
            <p className="text-xs text-black/40">
              {tags.length}/{subscription.plan.maxTags} tags used
            </p>
          )}
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-sm text-black/60">Active tags</p>
          <p className="mt-1 text-lg font-semibold">{activeTags}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-sm text-black/60">Tags marked lost</p>
          <p className="mt-1 text-lg font-semibold">{lostTags}</p>
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/dashboard/tags"
          className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
        >
          Manage tags
        </Link>
        <Link
          href="/dashboard/items"
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5"
        >
          Manage items
        </Link>
      </div>

      <div className="mt-10">
        <h2 className="font-semibold">Recent scans</h2>
        {recentScans.length === 0 ? (
          <p className="mt-2 text-sm text-black/60">No scans yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
            {recentScans.map((scan) => (
              <li key={scan.id} className="p-3 text-sm flex justify-between">
                <span>
                  {scan.tag.item?.label ?? scan.tag.publicDisplayName ?? scan.tag.shortCode}
                </span>
                <span className="text-black/50">
                  {scan.scannedAt.toLocaleString()}
                  {scan.approxCity ? ` · ${scan.approxCity}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
