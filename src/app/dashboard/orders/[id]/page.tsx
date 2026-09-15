import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCustomer();
  if (!user) redirect("/login");
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      items: { include: { product: true, tags: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  return (
    <div>
      <Link href="/dashboard/orders" className="text-sm text-black/50 hover:underline">
        ← Orders
      </Link>
      <h1 className="mt-2 text-2xl font-bold font-mono">{order.orderNumber}</h1>
      <p className="text-sm text-black/50">
        {order.createdAt.toLocaleString()} · {order.status} · {order.fulfillmentStatus}
      </p>

      <div className="mt-6 space-y-4">
        {order.items.map((item) => (
          <div key={item.id} className="rounded-lg border border-black/10 p-4">
            <div className="flex justify-between">
              <span className="font-medium">{item.product.name}</span>
              <span>
                {item.quantity} × {formatPrice(item.unitPriceCents, item.currency)}
              </span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {item.tags.map((t) => (
                <li key={t.id} className="flex justify-between">
                  <Link href={`/dashboard/tags/${t.id}`} className="font-mono text-emerald-700 hover:underline">
                    /t/{t.shortCode}
                  </Link>
                  <span className="text-black/50">{t.status}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg border border-black/10 p-4 text-sm">
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatPrice(order.totalCents, order.currency)}</span>
        </div>
        <ul className="mt-2 text-black/60">
          {order.payments.map((p) => (
            <li key={p.id} className="flex justify-between">
              <span>{p.provider}</span>
              <span>
                {p.status} · {p.createdAt.toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {(order.shipName || order.shipAddress) && (
        <div className="mt-4 rounded-lg border border-black/10 p-4 text-sm">
          <h2 className="font-semibold">Shipping</h2>
          <p className="mt-1 text-black/70">
            {[order.shipName, order.shipPhone, order.shipAddress, order.shipCity]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {order.shipNote && <p className="mt-1 text-black/50">{order.shipNote}</p>}
        </div>
      )}
    </div>
  );
}
