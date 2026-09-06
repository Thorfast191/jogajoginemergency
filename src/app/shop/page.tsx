import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { EmptyState, Badge } from "@/components/ui";
import { EmptyTags } from "@/components/illustrations";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { sortOrder: "asc" },
    include: { theme: true },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14">
        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">QR stickers for the things you carry</h1>
          <p className="mx-auto mt-3 max-w-xl text-black/60">
Each sticker is a one-time purchase and comes with a QR code you generate
            yourself. A subscription keeps the page it opens live.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md">
            <EmptyState illustration={<EmptyTags />} title="Products coming soon">
              We&apos;re getting the shop ready. Check back shortly.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 anim-stagger">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white hover-lift"
              >
                <Link href={`/shop/${p.slug}`} className="block bg-black/[0.03]">
                  {p.imageAssetId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/media/${p.imageAssetId}`}
                      alt={p.name}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <div className="aspect-square w-full" />
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <Link
                    href={`/shop/${p.slug}`}
                    className="font-bold hover:text-[var(--color-primary)]"
                  >
                    {p.name}
                  </Link>
                  {p.theme && (
                    <p className="mt-1">
                      <Badge tone="neutral">
                        {p.theme.name}
                      </Badge>
                    </p>
                  )}
                  <p className="mt-2 flex-1 text-sm text-black/60">{p.tagline}</p>
                  <p className="mt-3 text-sm">
                    <span className="font-bold">{formatPrice(p.priceCents, p.currency)}</span>
                    <span className="text-black/40"> · one-time</span>
                  </p>
                  <div className="mt-3">
                    <AddToCartButton
                      slug={p.slug}
                      className="w-full rounded-xl bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Add to cart
                    </AddToCartButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
