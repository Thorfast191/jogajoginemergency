import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { EmptyState } from "@/components/ui";
import { EmptyOrders } from "@/components/illustrations";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCustomer();
  if (!user) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: {
      items: { include: { product: { select: { name: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Orders</h1>
      <p className="mt-1 text-sm text-black/60">Your sticker purchases.</p>

      {orders.length === 0 ? (
        <div className="mt-6 max-w-md">
          <EmptyState illustration={<EmptyOrders />} title="No orders yet">
            <Link href="/shop" className="text-emerald-700 hover:underline">
              Visit the shop
            </Link>{" "}
            to get your first sticker.
          </EmptyState>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
          {orders.map((o) => (
            <li key={o.id} className="p-4 flex items-center justify-between text-sm">
              <div>
                <Link
                  href={`/dashboard/orders/${o.id}`}
                  className="font-mono text-emerald-700 hover:underline"
                >
                  {o.orderNumber}
                </Link>
                <p className="text-xs text-black/50">
                  {o.createdAt.toLocaleDateString()} ·{" "}
                  {o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(", ")}
                </p>
              </div>
              <div className="text-right">
                <p>{formatPrice(o.totalCents, o.currency)}</p>
                <p className="text-xs text-black/50">
                  {o.status} · {o.fulfillmentStatus}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
