import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { readCart, resolveCart } from "@/lib/cart-server";
import { formatPrice } from "@/lib/money";
import { EmptyState, PageHeader } from "@/components/ui";
import { EmptyCart } from "@/components/illustrations";
import { updateCartQtyAction, removeFromCartAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const cart = await resolveCart(await readCart());

  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-12">
        <PageHeader title="Your cart" subtitle="Stickers are a one-time purchase." />

        {cart.dropped.length > 0 && (
          <p className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
            {cart.dropped.length === 1 ? "An item is" : "Some items are"} no longer available and{" "}
            {cart.dropped.length === 1 ? "was" : "were"} removed.
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
              {cart.lines.map((line) => (
                <li key={line.slug} className="flex items-center gap-4 p-4">
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
                    </p>
                  </div>
                  <form action={updateCartQtyAction} className="flex items-center gap-2">
                    <input type="hidden" name="slug" value={line.slug} />
                    <label htmlFor={`qty-${line.slug}`} className="sr-only">
                      Quantity for {line.name}
                    </label>
                    <input
                      id={`qty-${line.slug}`}
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
                    <button
                      type="submit"
                      aria-label={`Remove ${line.name}`}
                      className="rounded-lg px-2 py-1 text-black/30 hover:bg-black/5 hover:text-red-600"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-black/10 bg-white p-5">
              <div>
                <p className="text-sm text-black/50">Total</p>
                <p className="text-2xl font-bold">{formatPrice(cart.totalCents, cart.currency)}</p>
              </div>
              <Link
                href="/checkout"
                className="rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.99]"
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
