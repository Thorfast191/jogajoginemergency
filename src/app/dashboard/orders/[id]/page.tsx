import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { intervalLabel } from "@/lib/subscription-periods";
import { canEditShipping } from "@/lib/order";
import { ShippingForm } from "@/components/shipping-form";
import { updateMyShippingAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCustomer();
  if (!user) redirect("/login");
  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      plan: { select: { name: true, intervalMonths: true } },
      items: { include: { product: true, theme: { select: { name: true } }, tags: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  const closed = order.status === "CANCELLED" || order.status === "REFUNDED";
  const mayEditShipping = canEditShipping(order);

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
              <span className="font-medium">
                {item.product.name}
                {item.theme && (
                  <span className="block text-xs font-normal text-black/50">
                    {item.theme.name} artwork
                  </span>
                )}
              </span>
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
        {/* An order can include a plan, so the total is not just the stickers. */}
        {order.plan && order.planPriceCents !== null && (
          <>
            <div className="flex justify-between text-black/60">
              <span>Stickers</span>
              <span>{formatPrice(order.subtotalCents, order.currency)}</span>
            </div>
            <div className="flex justify-between text-black/60">
              <span>
                {order.plan.name} plan · {intervalLabel(order.plan.intervalMonths)}
              </span>
              <span>{formatPrice(order.planPriceCents, order.currency)}</span>
            </div>
          </>
        )}
        <div className="mt-1 flex justify-between border-t border-black/10 pt-1 font-semibold">
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

      <div className="mt-4 rounded-lg border border-black/10 p-4 text-sm">
        <h2 className="font-semibold">Shipping</h2>
        {order.shipName || order.shipAddress ? (
          <p className="mt-1 text-black/70">
            {[order.shipName, order.shipPhone, order.shipAddress, order.shipCity]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          <p className="mt-1 text-black/50">No delivery address on this order.</p>
        )}
        {order.shipNote && <p className="mt-1 text-black/50">{order.shipNote}</p>}

        {/* Yours to fix until it ships — after that the parcel is with a
            courier and an edit here would just be wrong. */}
        {mayEditShipping ? (
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-medium text-black/50 hover:text-black">
              Change this address
            </summary>
            <div className="mt-3">
              <ShippingForm
                action={updateMyShippingAction.bind(null, order.id)}
                values={order}
                submitLabel="Save address"
              />
            </div>
          </details>
        ) : (
          <p className="mt-3 text-xs text-black/40">
            {closed
              ? "This order is closed, so its address can no longer be changed."
              : "This order has shipped, so its address can no longer be changed. Contact us if it needs to go somewhere else."}
          </p>
        )}
      </div>
    </div>
  );
}
