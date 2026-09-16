import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCustomer } from "@/lib/session";
import { readCart, resolveCart } from "@/lib/cart-server";
import { formatPrice } from "@/lib/money";
import { getSettings } from "@/lib/settings";
import { enabledGateways } from "@/lib/payments/enabled";
import { PaymentNotice } from "@/components/payment-notice";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string | string[] }>;
}) {
  const user = await getCustomer();
  if (!user) redirect("/login?next=/checkout");

  const cart = await resolveCart(await readCart());
  if (cart.lines.length === 0) redirect("/cart");

  const [settings, gateways] = await Promise.all([getSettings(), enabledGateways()]);
  const methods = gateways.map((g) => ({ id: g.id, label: g.label }));

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <Link href="/cart" className="text-sm text-black/50 hover:underline">
        ← Back to cart
      </Link>
      <h1 className="mt-2 text-3xl font-bold">Checkout</h1>
      <p className="mt-1 text-sm text-black/60">
        Stickers are a one-time purchase. You&apos;ll generate your QR codes straight after, and we
        print them into your stickers.
      </p>

      <div className="mt-6 empty:hidden">
        <PaymentNotice code={(await searchParams).payment} />
      </div>

      <ul className="mt-6 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
        {cart.lines.map((line) => (
          <li key={line.slug} className="flex justify-between gap-3 p-4 text-sm">
            <span>
              {line.name} <span className="text-black/40">× {line.qty}</span>
            </span>
            <span className="font-semibold">{formatPrice(line.lineTotalCents, line.currency)}</span>
          </li>
        ))}
        <li className="flex justify-between gap-3 p-4 font-bold">
          <span>Total</span>
          <span>{formatPrice(cart.totalCents, cart.currency)}</span>
        </li>
      </ul>

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
