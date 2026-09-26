import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { ShippingForm } from "@/components/shipping-form";
import { updateOrderShippingAction } from "../actions";
import { intervalLabel } from "@/lib/subscription-periods";
import { can } from "@/lib/permissions";
import { printReadiness } from "@/lib/print";
import { Forbidden } from "@/components/admin/forbidden";
import { Icon } from "@/components/icons";
import { OrderControls, RemindCustomerButton, ReplacementButton } from "../order-controls";

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
      plan: { select: { name: true, intervalMonths: true } },
      items: {
        orderBy: { id: "asc" },
        include: {
          product: true,
          theme: { select: { name: true } },
          tags: {
            orderBy: { createdAt: "asc" },
            include: { theme: { select: { name: true } } },
          },
        },
      },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!order) notFound();

  // A deactivated code is left out of the print file, so it must not count
  // towards the order being ready — otherwise the parcel ships a sticker short.
  // A replacement is printed but stands in for a code that already existed.
  const printableTags = (tags: { status: string; isReplacement: boolean }[]) =>
    tags.filter((t) => t.status !== "DEACTIVATED" && !t.isReplacement).length;
  const readiness = printReadiness(
    order.items.map((i) => ({
      quantity: i.quantity,
      qrSlots: i.product.qrSlots,
      tagsGenerated: printableTags(i.tags),
    })),
  );
  const printable = order.items.some((i) => i.tags.some((t) => t.status !== "DEACTIVATED"));
  const canSeeMoney = can(admin.role, "money.manage");

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

      {order.status === "PAID" && (
        <div
          className={`mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
            readiness.ready
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <p>
            {readiness.ready ? (
              <strong>Ready to print — every QR code is generated.</strong>
            ) : (
              <>
                <strong>Waiting for the customer:</strong> {readiness.generated} of {readiness.needed}{" "}
                QR codes generated. Printing unlocks when they&apos;re all done.
              </>
            )}
          </p>
          {readiness.ready ? (
            printable && (
              <a
                href={`/api/orders/${order.id}/stickers`}
                className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Icon name="download" width={16} height={16} />
                Download print PDF
              </a>
            )
          ) : (
            <RemindCustomerButton orderId={order.id} />
          )}
        </div>
      )}

      <div className="mt-6 grid md:grid-cols-[1fr_240px] gap-8">
        <div className="space-y-6">
          {order.items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex justify-between gap-3">
                <span className="font-medium">{item.product.name}</span>
                <span className="text-sm">
                  {item.quantity} × {formatPrice(item.unitPriceCents, item.currency)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-black/50">
                {item.quantity * item.product.qrSlots} QR code
                {item.quantity * item.product.qrSlots === 1 ? "" : "s"} · printed{" "}
                {item.product.stickerWidthMm} mm wide · {item.theme?.name ?? "product default"}{" "}
                artwork
              </p>

              {item.tags.length === 0 ? (
                <p className="mt-3 text-sm text-black/50">No QR codes generated for this line yet.</p>
              ) : (
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {item.tags.map((t) => (
                    <li key={t.id} className="flex gap-3 rounded-xl border border-black/10 p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/tags/${t.id}/sticker?size=thumb`}
                        alt=""
                        loading="lazy"
                        className="h-20 w-20 shrink-0 rounded-lg bg-black/[0.03] object-contain"
                      />
                      <div className="min-w-0 text-xs">
                        <Link href={`/admin/tags/${t.id}`} className="font-mono hover:underline">
                          /t/{t.shortCode}
                        </Link>
                        <p className="text-black/50">
                          {t.status} · {t.theme?.name ?? "Default theme"}
                          {t.isReplacement ? " · replacement" : ""}
                        </p>
                        <p className="mt-1 flex gap-2">
                          <a href={`/api/tags/${t.id}/sticker?download=1`} className="text-[var(--color-primary-dark)] hover:underline">
                            PNG
                          </a>
                          <a href={`/api/tags/${t.id}/sticker?format=pdf`} className="text-[var(--color-primary-dark)] hover:underline">
                            PDF
                          </a>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3">
                <ReplacementButton orderItemId={item.id} />
              </div>
            </div>
          ))}

          {canSeeMoney && (
            <div className="rounded-2xl border border-black/10 bg-white p-4">
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
          )}

          {/* Editable, not just displayed: a mistyped address was previously
              unfixable from either side, so the only outcomes were a lost
              parcel or a refund. Changes are written to the activity log. */}
          <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm">
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
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-black/50 hover:text-black">
                Correct the address
              </summary>
              <div className="mt-3">
                <ShippingForm
                  action={updateOrderShippingAction.bind(null, order.id)}
                  values={order}
                  submitLabel="Save address"
                />
              </div>
            </details>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white p-4 h-fit">
          {/* Broken out because an order can carry a plan, so the total is not
              the sum of the sticker lines. */}
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-black/50">Stickers</dt>
              <dd>{formatPrice(order.subtotalCents, order.currency)}</dd>
            </div>
            {order.plan && order.planPriceCents !== null && (
              <div className="flex justify-between gap-3">
                <dt className="text-black/50">
                  {order.plan.name} plan · {intervalLabel(order.plan.intervalMonths)}
                </dt>
                <dd>{formatPrice(order.planPriceCents, order.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-3 border-t border-black/10 pt-1">
              <dt>Total</dt>
              <dd className="font-semibold">{formatPrice(order.totalCents, order.currency)}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <OrderControls
              orderId={order.id}
              status={order.status}
              fulfillmentStatus={order.fulfillmentStatus}
              canChangeStatus={canSeeMoney}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
