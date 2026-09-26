import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { pageParams } from "@/lib/pagination";
import { Forbidden } from "@/components/admin/forbidden";
import { Pagination } from "@/components/admin/pagination";
import { SearchForm } from "@/components/admin/search-form";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = ["PENDING", "PAID", "CANCELLED", "REFUNDED"] as const;
type Status = (typeof ORDER_STATUSES)[number];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  if (!(await getStaffWith("orders.manage"))) return <Forbidden />;

  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as Status) ? (sp.status as Status) : undefined;
  const q = sp.q?.trim() || undefined;
  const { page, skip, take } = pageParams(sp.page);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    // An order is looked up by the number on the parcel, or by whoever is on
    // the phone about it.
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: "insensitive" } },
            { shipName: { contains: q, mode: "insensitive" } },
            { shipPhone: { contains: q, mode: "insensitive" } },
            { user: { email: { contains: q, mode: "insensitive" } } },
            { user: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  // Paged, not truncated. This list used to stop at 300 rows with no way
  // forward, which quietly put every older order out of reach of the console.
  const [orders, total, byStatus] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { user: { select: { name: true, email: true } }, _count: { select: { items: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const count = (s: string) => byStatus.find((g) => g.status === s)?._count._all ?? 0;
  const all = byStatus.reduce((n, g) => n + g._count._all, 0);

  // Changing a filter starts again at page one; the search rides along.
  const href = (next?: Status) => {
    const query = new URLSearchParams();
    if (next) query.set("status", next);
    if (q) query.set("q", q);
    const qs = query.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  };

  const chip = (on: boolean) =>
    on ? "font-semibold" : "text-black/50 hover:underline";

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="mt-4">
        <SearchForm
          action="/admin/orders"
          placeholder="Order number, customer, phone…"
          defaultValue={q}
          keep={{ status }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href={href()} className={chip(!status)}>
          All <span className="text-black/40">({all})</span>
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={href(s)} className={chip(status === s)}>
            {s} <span className="text-black/40">({count(s)})</span>
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Fulfilment</th>
              <th className="py-3 px-4">Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-black/5 last:border-b-0">
                <td className="py-3 px-4">
                  <Link href={`/admin/orders/${o.id}`} className="font-mono text-emerald-700 hover:underline">
                    {o.orderNumber}
                  </Link>
                  <div className="text-xs text-black/40">{o._count.items} item(s)</div>
                </td>
                <td className="py-3 px-4">
                  {o.user.name}
                  <div className="text-xs text-black/40">{o.user.email}</div>
                </td>
                <td className="py-3 px-4">{formatPrice(o.totalCents, o.currency)}</td>
                <td className="py-3 px-4">{o.status}</td>
                <td className="py-3 px-4">{o.fulfillmentStatus}</td>
                <td className="py-3 px-4">{o.placedAt ? o.placedAt.toLocaleDateString() : "—"}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-center text-black/50">
                  {q ? `No orders match “${q}”.` : "No orders."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination basePath="/admin/orders" params={{ status, q }} page={page} total={total} />
    </div>
  );
}
