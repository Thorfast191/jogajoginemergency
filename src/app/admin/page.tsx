import Link from "next/link";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { formatPrice } from "@/lib/money";
import { printReadiness } from "@/lib/print";
import { bucketWhere, entitledWhere } from "@/lib/subscription";
import { dailyScanCounts } from "@/lib/daily-server";
import { Forbidden } from "@/components/admin/forbidden";
import { BarChart } from "@/components/admin/bar-chart";
import { Icon, type IconName } from "@/components/icons";

export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

// Kept out of the component body so the render stays free of impure calls.
function now(): Date {
  return new Date();
}

type Tile = { label: string; value: string; sub?: string; href: string };
type Attention = { count: number; text: string; href: string; icon: IconName; tone: string };

export default async function AdminOverviewPage() {
  const admin = await getStaffWith("console.view");
  if (!admin) return <Forbidden />;
  const seesMoney = can(admin.role, "money.manage");
  const seesPlatform = can(admin.role, "settings.manage");

  const at = now();
  const weekAgo = new Date(at.getTime() - 7 * DAY_MS);
  const monthStart = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));

  const [
    customers,
    newCustomers,
    activeSubs,
    expiringSubs,
    tags,
    newTags,
    ordersThisWeek,
    unprinted,
    printing,
    openReports,
    daily,
    failedEmails,
    revenueMonth,
    revenueAll,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", createdAt: { gte: weekAgo } } }),
    prisma.subscription.count({ where: entitledWhere(at) }),
    prisma.subscription.count({ where: bucketWhere("expiring", at) }),
    prisma.tag.count(),
    prisma.tag.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.order.count({ where: { placedAt: { gte: weekAgo } } }),
    prisma.order.findMany({
      where: { status: "PAID", fulfillmentStatus: "UNFULFILLED" },
      select: {
        items: {
          select: {
            quantity: true,
            product: { select: { qrSlots: true } },
            _count: { select: { tags: true } },
          },
        },
      },
      take: 200,
    }),
    prisma.order.count({ where: { status: "PAID", fulfillmentStatus: "PROCESSING" } }),
    prisma.abuseReport.count({ where: { status: "OPEN" } }),
    dailyScanCounts(30, at),
    seesPlatform
      ? prisma.notificationLog.count({ where: { status: "FAILED", createdAt: { gte: weekAgo } } })
      : Promise.resolve(0),
    seesMoney
      ? prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: "SUCCEEDED", settledAt: { gte: monthStart } } })
      : Promise.resolve(null),
    seesMoney
      ? prisma.payment.aggregate({ _sum: { amountCents: true }, where: { status: "SUCCEEDED" } })
      : Promise.resolve(null),
  ]);

  let waitingOnCustomer = 0;
  let readyToPrint = 0;
  for (const order of unprinted) {
    const r = printReadiness(
      order.items.map((i) => ({ quantity: i.quantity, qrSlots: i.product.qrSlots, tagsGenerated: i._count.tags })),
    );
    if (r.ready) readyToPrint++;
    else waitingOnCustomer++;
  }

  const scans30 = daily.reduce((n, d) => n + d.count, 0);

  const tiles: Tile[] = [
    { label: "Customers", value: customers.toLocaleString(), sub: `+${newCustomers} this week`, href: "/admin/users?kind=customers" },
    { label: "Live pages", value: activeSubs.toLocaleString(), sub: `${expiringSubs} expiring within 7 days`, href: "/admin/subscriptions?bucket=active" },
    { label: "QR codes generated", value: tags.toLocaleString(), sub: `+${newTags} this week`, href: "/admin/tags" },
    { label: "Orders this week", value: ordersThisWeek.toLocaleString(), sub: `${printing} being printed`, href: "/admin/orders" },
  ];
  if (seesMoney) {
    tiles.push({
      label: "Revenue this month",
      value: formatPrice(revenueMonth?._sum.amountCents ?? 0, "BDT"),
      sub: `${formatPrice(revenueAll?._sum.amountCents ?? 0, "BDT")} all time`,
      href: "/admin/payments",
    });
  }

  const candidates: Attention[] = [
    { count: readyToPrint, text: "paid orders ready to print", href: "/admin/orders?status=PAID", icon: "download", tone: "bg-emerald-100 text-emerald-800" },
    { count: waitingOnCustomer, text: "paid orders waiting for the customer's QR codes", href: "/admin/orders?status=PAID", icon: "qr", tone: "bg-amber-100 text-amber-800" },
    { count: openReports, text: "open abuse reports", href: "/admin/abuse-reports", icon: "flag", tone: "bg-red-100 text-red-700" },
    { count: expiringSubs, text: "subscriptions ending within 7 days", href: "/admin/subscriptions?bucket=expiring", icon: "card", tone: "bg-sky-100 text-sky-700" },
    ...(seesPlatform
      ? [{ count: failedEmails, text: "emails failed to send this week", href: "/admin/settings", icon: "message" as IconName, tone: "bg-red-100 text-red-700" }]
      : []),
  ];
  const attention = candidates.filter((a) => a.count > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="mt-1 text-sm text-black/50">What&apos;s happening across Jogajog today.</p>

      <div className={`mt-6 grid gap-4 sm:grid-cols-2 ${seesMoney ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="rounded-2xl border border-black/10 bg-white p-4 transition-colors hover:border-[var(--color-primary)]"
          >
            <p className="text-sm text-black/60">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold">{t.value}</p>
            {t.sub && <p className="mt-1 text-xs text-black/40">{t.sub}</p>}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Scans per day</h2>
            <p className="text-sm text-black/50">
              {scans30.toLocaleString()} in the last 30 days ·{" "}
              <Link href="/admin/scans" className="text-[var(--color-primary-dark)] hover:underline">
                Details
              </Link>
            </p>
          </div>
          <div className="mt-5">
            <BarChart data={daily} unit="scan" />
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="font-semibold">Needs attention</h2>
          {attention.length === 0 ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-black/60">
              <Icon name="shield" className="text-[var(--color-primary)]" />
              All clear — nothing is waiting on the team.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {attention.map((a) => (
                <li key={a.text}>
                  <Link href={a.href} className="flex items-center gap-3 rounded-xl p-2 hover:bg-black/[0.03]">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${a.tone}`}>
                      <Icon name={a.icon} />
                    </span>
                    <span className="text-sm">
                      <strong className="text-base">{a.count}</strong> {a.text}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
