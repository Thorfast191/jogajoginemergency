import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { GetYourTagButton } from "@/components/get-your-tag-button";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { EmptyState } from "@/components/ui";
import { EmptyTags } from "@/components/illustrations";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1 mx-auto max-w-6xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold">QR stickers for the things you carry</h1>
          <p className="mt-3 text-black/60">
            One-time purchase. Each sticker links to your private emergency profile — no
            subscription needed.
          </p>
        </div>

        {products.length === 0 ? (
          <div className="mt-12 max-w-md mx-auto">
            <EmptyState illustration={<EmptyTags />} title="Products coming soon">
              We&apos;re getting the shop ready. Check back shortly.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <div key={p.id} className="rounded-xl border border-black/10 flex flex-col overflow-hidden">
                <Link href={`/shop/${p.slug}`} className="block bg-black/[0.02]">
                  {p.imageAssetId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/media/${p.imageAssetId}`}
                      alt={p.name}
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square" />
                  )}
                </Link>
                <div className="p-4 flex flex-col flex-1">
                  <Link href={`/shop/${p.slug}`} className="font-semibold hover:text-emerald-700">
                    {p.name}
                  </Link>
                  <p className="mt-1 text-sm text-black/60 flex-1">{p.tagline}</p>
                  <p className="mt-3 text-sm">
                    <span className="font-semibold">{formatPrice(p.priceCents, p.currency)}</span>
                    <span className="text-black/40"> · one-time</span>
                  </p>
                  <GetYourTagButton
                    productSlug={p.slug}
                    className="mt-3 inline-block text-center rounded-md bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
                  >
                    Get yours
                  </GetYourTagButton>
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
