import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCustomer } from "@/lib/session";
import { readResolvedCart } from "@/lib/cart-server";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { intervalLabel } from "@/lib/subscription-periods";
import { getSettings } from "@/lib/settings";
import { enabledGateways } from "@/lib/payments/enabled";
import { PaymentNotice } from "@/components/payment-notice";
import { addPlanToCartAction, removePlanFromCartAction } from "@/app/cart/actions";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string | string[] }>;
}) {
  const user = await getCustomer();
  if (!user) redirect("/login?next=/checkout");

  const cart = await readResolvedCart();
  if (cart.lines.length === 0) redirect("/cart");

  const [settings, gateways, plans] = await Promise.all([
    getSettings(),
    enabledGateways(),
    prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { priceCents: "asc" } }),
  ]);
  const methods = gateways.map((g) => ({ id: g.id, label: g.label }));
  const offer = plans[0] ?? null;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link href="/cart" className="text-sm text-black/50 hover:underline">
        ← Back to cart
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Checkout</h1>
      <p className="mt-1 text-sm text-black/60">
        Stickers are a one-time purchase. Your QR codes are made as soon as you pay, and we print
        them into your stickers.
      </p>

      <div className="mt-6 empty:hidden">
        <PaymentNotice code={(await searchParams).payment} />
      </div>

      <ul className="mt-6 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
        {cart.lines.map((line) => (
          <li
            key={`${line.slug}-${line.themeSlug ?? "default"}`}
            className="flex justify-between gap-3 p-4 text-sm"
          >
            <span>
              {line.name} <span className="text-black/40">× {line.qty}</span>
              {line.themeName && (
                <span className="block text-xs text-black/40">{line.themeName} artwork</span>
              )}
            </span>
            <span className="font-semibold">{formatPrice(line.lineTotalCents, line.currency)}</span>
          </li>
        ))}

        {cart.plan && (
          <li className="flex items-start justify-between gap-3 p-4 text-sm">
            <span>
              {cart.plan.name} plan
              <span className="block text-xs text-black/40">
                Publishes your page · per {intervalLabel(cart.plan.intervalMonths)}, no automatic
                renewal
              </span>
              <form action={removePlanFromCartAction}>
                <button
                  type="submit"
                  className="mt-1 text-xs font-medium text-black/40 underline hover:text-black"
                >
                  Remove
                </button>
              </form>
            </span>
            <span className="font-semibold">
              {formatPrice(cart.plan.priceCents, cart.plan.currency)}
            </span>
          </li>
        )}

        <li className="flex justify-between gap-3 p-4 font-bold">
          <span>Total</span>
          <span>{formatPrice(cart.totalCents, cart.currency)}</span>
        </li>
      </ul>

      {/* Last chance to publish the page in the same payment. Asking here, and
          not after the card is charged, is the whole point. */}
      {!cart.plan && offer && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/[0.04] p-4">
          <p className="max-w-sm text-sm text-black/70">
            Without a plan your QR codes still scan and finders can still message you — your details
            just aren&apos;t shown. Add the <strong>{offer.name} plan</strong> for{" "}
            {formatPrice(offer.priceCents, offer.currency)} per {intervalLabel(offer.intervalMonths)}{" "}
            and pay once.
          </p>
          <form action={addPlanToCartAction}>
            <input type="hidden" name="planSlug" value={offer.slug} />
            <button
              type="submit"
              className="rounded-xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.99]"
            >
              Add it
            </button>
          </form>
        </div>
      )}

      <div className="mt-6">
        {settings.ordersPaused ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {settings.ordersPausedMessage ??
              "The shop isn't taking new orders right now. Your cart is saved — please check back soon."}
          </p>
        ) : (
          // Minted here rather than in the client component so server and
          // client render the same value (no hydration mismatch). The page is
          // force-dynamic, so every fresh visit is a genuinely new purchase.
          <CheckoutForm idempotencyKey={randomUUID()} methods={methods} />
        )}
      </div>
    </div>
  );
}
