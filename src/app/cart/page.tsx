import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { readResolvedCart } from "@/lib/cart-server";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { intervalLabel } from "@/lib/subscription-periods";
import { getSettings } from "@/lib/settings";
import { EmptyState, PageHeader } from "@/components/ui";
import { EmptyCart } from "@/components/illustrations";
import { Icon } from "@/components/icons";
import {
  updateCartQtyAction,
  removeFromCartAction,
  addPlanToCartAction,
  removePlanFromCartAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const [cart, settings, plans] = await Promise.all([
    readResolvedCart(),
    getSettings(),
    prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceCents: "asc" },
    }),
  ]);

  // The plan on offer here is the cheapest active one. Publishing the page is
  // part of buying the sticker, not a second purchase discovered afterwards.
  const offer = plans[0] ?? null;

  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12">
        <PageHeader title="Your cart" subtitle="Stickers are a one-time purchase." />

        {settings.ordersPaused && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {settings.ordersPausedMessage ??
              "The shop isn't taking new orders right now. Your cart is saved — please check back soon."}
          </p>
        )}

        {cart.dropped.length > 0 && (
          <p className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            {cart.dropped.length === 1 ? "An item is" : "Some items are"} no longer available and{" "}
            {cart.dropped.length === 1 ? "was" : "were"} removed.
          </p>
        )}

        {cart.planDropped && (
          <p className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            The plan in your cart is no longer on sale and was removed.
          </p>
        )}

        {cart.lines.length === 0 ? (
          <div className="mt-10">
            <EmptyState illustration={<EmptyCart />} title="Your cart is empty">
              <Link href="/shop" className="text-[var(--color-primary)] font-medium hover:underline">
                Browse stickers →
              </Link>
            </EmptyState>
          </div>
        ) : (
          <>
            <ul className="mt-8 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
              {cart.lines.map((line) => {
                const lineId = `${line.slug}-${line.themeSlug ?? "default"}`;
                return (
                  <li key={lineId} className="flex items-center gap-4 p-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black/[0.03]">
                      {line.imageAssetId && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/media/${line.imageAssetId}`} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/shop/${line.slug}`} className="font-semibold hover:underline">
                        {line.name}
                      </Link>
                      <p className="text-sm text-black/50">
                        {formatPrice(line.unitPriceCents, line.currency)} each
                        {line.themeName && <> · {line.themeName} artwork</>}
                      </p>
                    </div>
                    <form action={updateCartQtyAction} className="flex items-center gap-2">
                      <input type="hidden" name="slug" value={line.slug} />
                      {line.themeSlug && <input type="hidden" name="theme" value={line.themeSlug} />}
                      <label htmlFor={`qty-${lineId}`} className="sr-only">
                        Quantity for {line.name}
                      </label>
                      <input
                        id={`qty-${lineId}`}
                        name="qty"
                        type="number"
                        min={1}
                        max={10}
                        defaultValue={line.qty}
                        className="w-16 rounded-lg border border-black/15 px-2 py-1 text-sm"
                      />
                      <button type="submit" className="text-xs font-medium text-black/50 hover:text-black">
                        Update
                      </button>
                    </form>
                    <p className="w-24 text-right font-semibold">
                      {formatPrice(line.lineTotalCents, line.currency)}
                    </p>
                    <form action={removeFromCartAction}>
                      <input type="hidden" name="slug" value={line.slug} />
                      {line.themeSlug && <input type="hidden" name="theme" value={line.themeSlug} />}
                      <button
                        type="submit"
                        aria-label={`Remove ${line.name}`}
                        className="rounded-lg px-2 py-1 text-black/30 hover:bg-black/5 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>

            {/* The plan, offered here rather than discovered after payment. */}
            {cart.plan ? (
              <div className="mt-4 flex items-center gap-4 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.04] p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]">
                  <Icon name="sparkle" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{cart.plan.name} plan</p>
                  <p className="text-sm text-black/60">
                    Publishes your page · {formatPrice(cart.plan.priceCents, cart.plan.currency)} per{" "}
                    {intervalLabel(cart.plan.intervalMonths)}, no automatic renewal
                  </p>
                </div>
                <p className="w-24 text-right font-semibold">
                  {formatPrice(cart.plan.priceCents, cart.plan.currency)}
                </p>
                <form action={removePlanFromCartAction}>
                  <button
                    type="submit"
                    aria-label={`Remove the ${cart.plan.name} plan`}
                    className="rounded-lg px-2 py-1 text-black/30 hover:bg-black/5 hover:text-red-600"
                  >
                    ✕
                  </button>
                </form>
              </div>
            ) : (
              offer && (
                <div className="mt-4 rounded-2xl border border-black/10 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold">Publish your page too?</p>
                      <p className="mt-1 max-w-md text-sm text-black/60">
                        Your sticker scans either way. The <strong>{offer.name} plan</strong> is what
                        shows your emergency details to whoever finds your things — add it now and
                        it&apos;s one payment.
                      </p>
                      <p className="mt-2 text-sm text-black/50">
                        {formatPrice(offer.priceCents, offer.currency)} per{" "}
                        {intervalLabel(offer.intervalMonths)} · cancel any time · no automatic renewal
                      </p>
                    </div>
                    <form action={addPlanToCartAction}>
                      <input type="hidden" name="planSlug" value={offer.slug} />
                      <button
                        type="submit"
                        className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.99]"
                      >
                        Add the {offer.name} plan
                      </button>
                    </form>
                  </div>
                </div>
              )
            )}

            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-5">
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-black/50">Stickers</dt>
                  <dd>{formatPrice(cart.goodsCents, cart.currency)}</dd>
                </div>
                {cart.plan && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-black/50">
                      {cart.plan.name} plan · {intervalLabel(cart.plan.intervalMonths)}
                    </dt>
                    <dd>{formatPrice(cart.plan.priceCents, cart.plan.currency)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex items-center justify-between gap-4 border-t border-black/10 pt-4">
                <div>
                  <p className="text-sm text-black/50">Total</p>
                  <p className="text-2xl font-bold">{formatPrice(cart.totalCents, cart.currency)}</p>
                </div>
                {settings.ordersPaused ? (
                  <span className="rounded-xl bg-black/10 px-6 py-3 font-semibold text-black/40">
                    Checkout paused
                  </span>
                ) : (
                  <Link
                    href="/checkout"
                    className="rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.99]"
                  >
                    Checkout
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
