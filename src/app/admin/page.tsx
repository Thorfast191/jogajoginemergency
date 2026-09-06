import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Kept out of the component body so the render stays free of impure calls.
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export default async function AdminOverviewPage() {
  if (!(await getAdmin())) redirect("/dashboard");

  const weekAgo = daysAgo(7);
  const [
    customers,
    suspended,
    issuedTags,
    activeSubs,
    openReports,
    scanCount,
    activeProducts,
    recentOrders,
    revenue,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { role: "USER", status: "SUSPENDED" } }),
    prisma.tag.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.abuseReport.count({ where: { status: "OPEN" } }),
    prisma.scanEvent.count(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.order.count({ where: { placedAt: { gte: weekAgo } } }),
    prisma.payment.aggregate({
      _sum: { amountCents: true },
      where: { kind: "ORDER", status: "SUCCEEDED" },
    }),
  ]);
  const revenueBdt = Math.round((revenue._sum.amountCents ?? 0) / 100);

  const groups: { title: string; stats: { label: string; value: number; href?: string }[] }[] = [
    {
      title: "Store",
      stats: [
        { label: "Active products", value: activeProducts, href: "/admin/products" },
        { label: "Orders (7 days)", value: recentOrders, href: "/admin/orders" },
        { label: "Order revenue (BDT)", value: revenueBdt, href: "/admin/orders" },
      ],
    },
    {
      title: "Customers",
      stats: [
        { label: "Customer accounts", value: customers, href: "/admin/users" },
        { label: "Suspended", value: suspended, href: "/admin/users" },
        { label: "Active subscriptions", value: activeSubs, href: "/admin/subscriptions" },
      ],
    },
    {
      title: "Tag inventory",
      stats: [
        { label: "Issued to customers", value: issuedTags, href: "/admin/tags/issued" },
      ],
    },
    {
      title: "Monitoring",
      stats: [
        { label: "Total scans", value: scanCount, href: "/admin/scans" },
        { label: "Open abuse reports", value: openReports, href: "/admin/abuse-reports" },
      ],
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>

      {groups.map((group) => (
        <section key={group.title} className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-black/40">{group.title}</h2>
          <div className="mt-2 grid sm:grid-cols-3 gap-4">
            {group.stats.map((s) => {
              const card = (
                <div className="rounded-lg border border-black/10 bg-white p-4 h-full hover:border-emerald-600">
                  <p className="text-sm text-black/60">{s.label}</p>
                  <p className="mt-1 text-2xl font-semibold">{s.value}</p>
                </div>
              );
              return s.href ? (
                <Link key={s.label} href={s.href}>
                  {card}
                </Link>
              ) : (
                <div key={s.label}>{card}</div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
