import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { slotBalanceForUser } from "@/lib/slots-server";
import { userIsEntitled } from "@/lib/subscription";
import { Icon, type IconName } from "@/components/icons";
import { MascotCheer } from "@/components/illustrations";
import { PaymentNotice } from "@/components/payment-notice";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

// Kept out of the component body so the render stays free of impure calls.
function monthAgo(): Date {
  return new Date(Date.now() - 30 * DAY_MS);
}

function tagLabel(t: { internalLabel: string | null; shortCode: string }) {
  return t.internalLabel ?? t.shortCode;
}

type Step = { title: string; body: string; done: boolean; href: string; cta: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string | string[] }>;
}) {
  const user = await getCustomer();
  if (!user) redirect("/login");
  const userId = user.id;
  const since = monthAgo();

  const [profile, tagGroups, paidOrders, balance, entitled, scans30, messages30, recentScans, recentMessages, recentOrders] =
    await Promise.all([
      prisma.emergencyProfile.findUnique({
        where: { userId },
        include: { _count: { select: { contacts: true } } },
      }),
      prisma.tag.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
      prisma.order.count({ where: { userId, status: "PAID" } }),
      slotBalanceForUser(userId),
      userIsEntitled(userId),
      prisma.scanEvent.count({ where: { tag: { userId }, scannedAt: { gte: since } } }),
      prisma.relayMessage.count({ where: { tag: { userId }, createdAt: { gte: since } } }),
      prisma.scanEvent.findMany({
        where: { tag: { userId } },
        include: { tag: { select: { id: true, internalLabel: true, shortCode: true } } },
        orderBy: { scannedAt: "desc" },
        take: 5,
      }),
      prisma.relayMessage.findMany({
        where: { tag: { userId } },
        include: { tag: { select: { internalLabel: true, shortCode: true } } },
        orderBy: { createdAt: "desc" },
        take: 3,
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
  const profileReady = Boolean(profile && (profile.emergencyMessage?.trim() || profile._count.contacts > 0));

  const steps: Step[] = [
    { title: "Fill in your emergency profile", body: "A message for finders, and who to call.", done: profileReady, href: "/dashboard/profile", cta: "Open profile" },
    { title: "Buy a sticker", body: "Pick one in the theme you like.", done: paidOrders > 0, href: "/shop", cta: "Visit the shop" },
    { title: "Generate your QR codes", body: "We print them into the middle of your stickers.", done: balance.owned > 0 && balance.available === 0, href: "/dashboard/tags", cta: "Generate" },
    { title: "Publish your page", body: "A plan shows your information when someone scans.", done: entitled, href: "/dashboard/subscription", cta: "Choose a plan" },
  ];
  const done = steps.filter((s) => s.done).length;

  const cards: { label: string; value: string; sub: string; icon: IconName; href: string; tone: string }[] = [
    {
      label: "Your page",
      value: entitled ? "Live" : "Not published",
      sub: entitled ? "Finders see what you shared" : "Only the message box shows",
      icon: "shield",
      href: "/dashboard/subscription",
      tone: entitled ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
    },
    { label: "QR codes", value: String(count("ACTIVE")), sub: `${totalTags} total · ${count("LOST")} marked lost`, icon: "qr", href: "/dashboard/tags", tone: "bg-sky-100 text-sky-700" },
    { label: "Scans", value: String(scans30), sub: "in the last 30 days", icon: "activity", href: "/dashboard/tags", tone: "bg-violet-100 text-violet-700" },
    { label: "Messages", value: String(messages30), sub: "from finders, last 30 days", icon: "message", href: "/dashboard/messages", tone: "bg-rose-100 text-rose-700" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold sm:text-3xl">Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h1>
      <p className="mt-1 text-sm text-black/50">Here&apos;s how your stickers and page are doing.</p>

      <div className="mt-5 empty:hidden">
        <PaymentNotice code={(await searchParams).payment} />
      </div>

      {balance.available > 0 && (
        <Link
          href="/dashboard/tags"
          className="anim-pop mt-5 flex items-center justify-between gap-4 rounded-2xl bg-[var(--color-primary)] px-5 py-4 text-white shadow-sm"
        >
          <span className="flex items-center gap-3">
            <Icon name="qr" width={22} height={22} />
            <span>
              <strong className="block">
                Generate your {balance.available} QR {balance.available === 1 ? "code" : "codes"}
              </strong>
              <span className="text-sm text-white/80">We print them into your stickers as soon as they&apos;re ready.</span>
            </span>
          </span>
          <span className="hidden font-semibold sm:inline">Generate →</span>
        </Link>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 anim-stagger">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-2xl border border-black/10 bg-white p-4 hover-lift">
            <span className={`grid h-9 w-9 place-items-center rounded-xl ${c.tone}`}>
              <Icon name={c.icon} />
            </span>
            <p className="mt-3 text-sm text-black/60">{c.label}</p>
            <p className="text-xl font-semibold">{c.value}</p>
            <p className="mt-0.5 text-xs text-black/40">{c.sub}</p>
          </Link>
        ))}
      </div>

      {done < steps.length ? (
        <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Getting started</h2>
            <span className="text-sm text-black/50">
              {done} of {steps.length} done
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-primary)]/10">
            <div
              className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-700"
              style={{ width: `${(done / steps.length) * 100}%` }}
            />
          </div>
          <ol className="mt-4 divide-y divide-black/5">
            {steps.map((s, i) => (
              <li key={s.title} className="flex items-center justify-between gap-4 py-3">
                <span className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${
                      s.done ? "bg-[var(--color-primary)] text-white" : "bg-black/[0.06] text-black/50"
                    }`}
                    aria-hidden
                  >
                    {s.done ? "✓" : i + 1}
                  </span>
                  <span>
                    <span className={`block text-sm font-semibold ${s.done ? "text-black/40 line-through" : ""}`}>{s.title}</span>
                    <span className="block text-xs text-black/50">{s.body}</span>
                  </span>
                </span>
                {!s.done && (
                  <Link href={s.href} className="shrink-0 rounded-lg border border-black/15 px-3 py-1.5 text-xs font-semibold hover:bg-black/5">
                    {s.cta}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <section className="mt-6 flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <MascotCheer className="h-14 w-14 shrink-0 text-[var(--color-primary)] anim-bob" />
          <div>
            <p className="font-semibold text-emerald-900">You&apos;re all set.</p>
            <p className="text-sm text-emerald-800">
              Your page is live and your QR codes are ready. Anyone who finds your things can reach you.
            </p>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="font-semibold">Recent scans</h2>
          {recentScans.length === 0 ? (
            <p className="mt-3 text-sm text-black/50">No scans yet. When someone scans a sticker, it shows up here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5 text-sm">
              {recentScans.map((scan) => (
                <li key={scan.id} className="flex justify-between gap-3 py-2.5">
                  <Link href={`/dashboard/tags/${scan.tag.id}`} className="font-medium hover:underline">
                    {tagLabel(scan.tag)}
                  </Link>
                  <span className="text-right text-black/50">
                    {scan.scannedAt.toLocaleString()}
                    {scan.approxCity ? ` · ${scan.approxCity}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Messages from finders</h2>
            <Link href="/dashboard/messages" className="text-xs font-medium text-[var(--color-primary-dark)] hover:underline">
              View all
            </Link>
          </div>
          {recentMessages.length === 0 ? (
            <p className="mt-3 text-sm text-black/50">No messages yet.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {recentMessages.map((m) => (
                <li key={m.id} className="rounded-xl bg-black/[0.03] p-3">
                  <div className="flex justify-between gap-3 text-xs text-black/50">
                    <span className="font-medium text-black/70">{tagLabel(m.tag)}</span>
                    <span>{m.createdAt.toLocaleString()}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-black/80">{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Link href="/dashboard/orders" className="text-xs font-medium text-[var(--color-primary-dark)] hover:underline">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="mt-3 text-sm text-black/50">
            No orders yet.{" "}
            <Link href="/shop" className="font-medium text-[var(--color-primary-dark)] hover:underline">
              Visit the shop
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5 text-sm">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex justify-between gap-3 py-2.5">
                <Link href={`/dashboard/orders/${o.id}`} className="font-mono text-[var(--color-primary-dark)] hover:underline">
                  {o.orderNumber}
                </Link>
                <span className="text-black/50">
                  {o._count.items} item{o._count.items === 1 ? "" : "s"} · {o.status.toLowerCase()} ·{" "}
                  {o.fulfillmentStatus.toLowerCase()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
