import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = ["PENDING", "PAID", "CANCELLED", "REFUNDED"] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  if (!(await getAdmin())) redirect("/dashboard");
  const { status } = await searchParams;
  const where = ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])
    ? { status: status as (typeof ORDER_STATUSES)[number] }
    : {};

  const orders = await prisma.order.findMany({
    where,
    include: { user: { select: { name: true, email: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>

      <div className="mt-4 flex gap-2 text-sm">
        <Link href="/admin/orders" className={!status ? "font-semibold" : "text-black/50 hover:underline"}>
          All
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={status === s ? "font-semibold" : "text-black/50 hover:underline"}
          >
            {s}
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
                  No orders.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
