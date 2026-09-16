import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Reveal } from "@/components/reveal";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { EmptyState, Badge } from "@/components/ui";
import { EmptyTags } from "@/components/illustrations";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { sortOrder: "asc" },
    // Only a live theme has a public preview image; a drafted or archived one
    // would render a broken image instead of the product's own photo.
    include: { theme: { select: { id: true, name: true, status: true } } },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="bg-wash border-b border-black/5">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center">
            <h1 className="anim-pop text-3xl font-bold sm:text-5xl">QR stickers for the things you carry</h1>
            <p className="anim-pop mx-auto mt-4 max-w-2xl text-black/60">
              Every sticker leaves an empty square in the middle for your own QR code. Buy it once,
              generate your code in your dashboard, and we print and ship it. A plan keeps the page
              it opens live.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 py-12">
          {products.length === 0 ? (
            <div className="mx-auto max-w-md">
              <EmptyState illustration={<EmptyTags />} title="Products coming soon">
                We&apos;re getting the shop ready. Check back shortly.
              </EmptyState>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p, i) => {
                const preview = p.theme?.status === "ACTIVE" ? p.theme : null;
                return (
                <Reveal key={p.id} delay={i * 80}>
                  <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white hover-lift">
                    <Link href={`/shop/${p.slug}`} className="relative block overflow-hidden bg-black/[0.03]">
                      {preview || p.imageAssetId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={preview ? `/api/themes/${preview.id}/preview` : `/media/${p.imageAssetId}`}
                          alt={p.name}
                          loading="lazy"
                          className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                      ) : (
                        <div className="aspect-square w-full" />
                      )}
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold shadow-sm">
                        {p.qrSlots} QR {p.qrSlots === 1 ? "code" : "codes"}
                      </span>
                    </Link>
                    <div className="flex flex-1 flex-col p-4">
                      <Link href={`/shop/${p.slug}`} className="font-bold hover:text-[var(--color-primary)]">
                        {p.name}
                      </Link>
                      {preview && (
                        <p className="mt-1">
                          <Badge tone="neutral">{preview.name} theme</Badge>
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
                </Reveal>
                );
              })}
            </div>
          )}

          <Reveal className="mt-14">
            <div className="grid gap-4 rounded-3xl border border-black/10 bg-white p-6 sm:grid-cols-3">
              {[
                ["1. Buy", "A one-time purchase, in the theme you like."],
                ["2. Generate", "Make your QR in your dashboard — it's printed in the middle."],
                ["3. Stick & relax", "We ship it. Anyone who scans it can reach you."],
              ].map(([t, b]) => (
                <div key={t}>
                  <p className="font-bold">{t}</p>
                  <p className="mt-1 text-sm text-black/60">{b}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
