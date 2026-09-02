import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { GetYourTagButton } from "@/components/get-your-tag-button";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug } });
  if (!product || product.status !== "ACTIVE") notFound();

  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1 mx-auto max-w-4xl px-4 py-16">
        <Link href="/shop" className="text-sm text-black/50 hover:underline">
          ← Back to shop
        </Link>

        <div className="mt-4 grid md:grid-cols-2 gap-10">
          <div className="rounded-xl border border-black/10 bg-black/[0.02] overflow-hidden">
            {product.imageAssetId && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/media/${product.imageAssetId}`}
                alt={product.name}
                className="w-full aspect-square object-cover"
              />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold">{product.name}</h1>
            <p className="mt-1 text-black/60">{product.tagline}</p>

            <p className="mt-4 text-2xl font-bold">
              {formatPrice(product.priceCents, product.currency)}
            </p>
            <span className="mt-1 inline-block rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium px-2 py-0.5">
              One-time purchase — no subscription
            </span>

            <p className="mt-6 text-sm text-black/70 whitespace-pre-line">{product.description}</p>
            {product.useCase && (
              <p className="mt-4 text-sm text-black/60">
                <span className="font-medium text-black/80">Use case: </span>
                {product.useCase}
              </p>
            )}

            <div className="mt-8">
              <GetYourTagButton productSlug={product.slug}>Get yours</GetYourTagButton>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
