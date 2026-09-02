import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function tagLabel(t: { internalLabel: string | null; shortCode: string }) {
  return t.internalLabel ?? t.shortCode;
}

export default async function DashboardPage() {
  const user = await getCustomer();
  if (!user) redirect("/login");
  const userId = user.id;

  const [profile, tagGroups, recentScans, recentMessages, recentOrders] = await Promise.all([
    prisma.emergencyProfile.findUnique({
      where: { userId },
      include: { _count: { select: { contacts: true } } },
    }),
    prisma.tag.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
    prisma.scanEvent.findMany({
      where: { tag: { userId } },
      include: { tag: { select: { internalLabel: true, shortCode: true } } },
      orderBy: { scannedAt: "desc" },
      take: 5,
    }),
    prisma.relayMessage.findMany({
      where: { tag: { userId } },
      include: { tag: { select: { internalLabel: true, shortCode: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
      include: { _count: { select: { items: true } } },
    }),
  ]);

  const count = (s: string) => tagGroups.find((g) => g.status === s)?._count._all ?? 0;
  const totalTags = tagGroups.reduce((n, g) => n + g._count._all, 0);

  const completion = profile
    ? [
        Boolean(profile.photoAssetId),
        Boolean(profile.emergencyMessage?.trim()),
        profile._count.contacts > 0,
        profile.contactMode === "RELAY" || Boolean(profile.phonePublic?.trim()),
      ]
    : [false, false, false, false];
  const done = completion.filter(Boolean).length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome back{user.name ? `, ${user.name}` : ""}</h1>

      <div className="mt-6 grid sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-sm text-black/60">Emergency profile</p>
          <p className="mt-1 text-lg font-semibold">{done}/4 complete</p>
          <Link href="/dashboard/profile" className="text-xs text-emerald-700 hover:underline">
            {done === 4 ? "Review profile" : "Finish setup"}
          </Link>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-sm text-black/60">Active tags</p>
          <p className="mt-1 text-lg font-semibold">{count("ACTIVE")}</p>
          <p className="text-xs text-black/40">{totalTags} total</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-sm text-black/60">Tags marked lost</p>
          <p className="mt-1 text-lg font-semibold">{count("LOST")}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/dashboard/profile"
          className="rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
        >
          Edit my profile
        </Link>
        <Link
          href="/shop"
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5"
        >
          Buy a sticker
        </Link>
        <Link
          href="/dashboard/tags"
          className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5"
        >
          Manage tags
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
                <span>{tagLabel(scan.tag)}</span>
                <span className="text-black/50">
                  {scan.scannedAt.toLocaleString()}
                  {scan.approxCity ? ` · ${scan.approxCity}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent messages from finders</h2>
          <Link href="/dashboard/messages" className="text-xs text-emerald-600 hover:underline">
            View all
          </Link>
        </div>
        {recentMessages.length === 0 ? (
          <p className="mt-2 text-sm text-black/60">No messages yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
            {recentMessages.map((m) => (
              <li key={m.id} className="p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{tagLabel(m.tag)}</span>
                  <span className="text-black/50">{m.createdAt.toLocaleString()}</span>
                </div>
                <p className="mt-1 text-black/70">{m.message}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-xs text-emerald-600 hover:underline">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="mt-2 text-sm text-black/60">
            No orders yet. <Link href="/shop" className="text-emerald-700 hover:underline">Visit the shop</Link>.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
            {recentOrders.map((o) => (
              <li key={o.id} className="p-3 text-sm flex justify-between">
                <Link href={`/dashboard/orders/${o.id}`} className="font-mono text-emerald-700 hover:underline">
                  {o.orderNumber}
                </Link>
                <span className="text-black/50">
                  {o._count.items} item{o._count.items === 1 ? "" : "s"} · {o.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
