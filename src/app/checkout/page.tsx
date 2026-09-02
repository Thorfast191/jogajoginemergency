import { redirect } from "next/navigation";
import Link from "next/link";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { parseCheckoutParams } from "@/lib/cart";
import { CheckoutForm } from "./checkout-form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCustomer();
  if (!user) redirect("/login?next=/shop");

  const parsed = parseCheckoutParams(await searchParams);
  if (!parsed) redirect("/shop");

  const product = await prisma.product.findUnique({ where: { slug: parsed.productSlug } });
  if (!product || product.status !== "ACTIVE") redirect("/shop");

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <Link href={`/shop/${product.slug}`} className="text-sm text-black/50 hover:underline">
        ← Back to {product.name}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Checkout</h1>
      <p className="mt-1 text-sm text-black/60">One-time purchase. No subscription.</p>

      <div className="mt-6">
        <CheckoutForm
          product={{
            slug: product.slug,
            name: product.name,
            priceCents: product.priceCents,
            currency: product.currency,
          }}
          quantity={parsed.quantity}
        />
      </div>
    </div>
  );
}
