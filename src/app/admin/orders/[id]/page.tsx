import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { can } from "@/lib/permissions";
import { Forbidden } from "@/components/admin/forbidden";
import { OrderControls, ReplacementButton } from "../order-controls";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getStaffWith("orders.manage");
  if (!admin) return <Forbidden />;
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: { include: { product: true, tags: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-black/50 hover:underline">
        ← Orders
      </Link>
      <h1 className="mt-2 text-2xl font-bold font-mono">{order.orderNumber}</h1>
      <p className="text-sm text-black/50">
        <Link href={`/admin/users/${order.user.id}`} className="hover:underline">
          {order.user.name} · {order.user.email}
        </Link>
      </p>

      <div className="mt-6 grid md:grid-cols-[1fr_220px] gap-8">
        <div className="space-y-6">
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
                  <li key={t.id} className="flex justify-between font-mono text-xs">
                    <span>/t/{t.shortCode}</span>
                    <span className="text-black/50">{t.status}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <ReplacementButton orderItemId={item.id} />
              </div>
            </div>
          ))}

          <div className="rounded-lg border border-black/10 p-4">
            <h2 className="font-semibold text-sm">Payments</h2>
            <ul className="mt-2 text-sm">
              {order.payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>
                    {formatPrice(p.amountCents, p.currency)} · {p.provider}
                  </span>
                  <span className="text-black/50">
                    {p.status} · {p.createdAt.toLocaleDateString()}
                  </span>
                </li>
              ))}
              {order.payments.length === 0 && <li className="text-black/50">No payments.</li>}
            </ul>
          </div>

          {(order.shipName || order.shipAddress) && (
            <div className="rounded-lg border border-black/10 p-4 text-sm">
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

        <div className="rounded-lg border border-black/10 p-4 h-fit">
          <p className="text-sm">
            Total: <span className="font-semibold">{formatPrice(order.totalCents, order.currency)}</span>
          </p>
          <div className="mt-4">
            <OrderControls
              orderId={order.id}
              status={order.status}
              fulfillmentStatus={order.fulfillmentStatus}
              canChangeStatus={can(admin.role, "money.manage")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
