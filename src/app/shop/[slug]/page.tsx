import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ThemeMascot } from "@/components/illustrations";
import { Badge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { themeCssVars, type ThemeSkin } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug }, include: { theme: true } });
  if (!product || product.status !== "ACTIVE") notFound();

  const theme = product.theme as ThemeSkin | null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <Link href="/shop" className="text-sm text-black/50 hover:underline">
          ← Back to shop
        </Link>

        <div className="mt-4 grid gap-10 md:grid-cols-2">
          <div
            style={theme ? (themeCssVars(theme) as React.CSSProperties) : undefined}
            className="overflow-hidden rounded-2xl border border-black/10 bg-[var(--skin-bg,#f7f7f7)]"
          >
            {product.imageAssetId || product.theme?.artAssetId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/media/${product.imageAssetId ?? product.theme?.artAssetId}`}
                alt={product.name}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <div className="grid aspect-square w-full place-items-center">
                <ThemeMascot
                  mascot={theme?.mascot}
                  className="h-40 w-40 text-[var(--skin-accent,#0f9d76)] anim-float"
                />
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="mt-1 text-black/60">{product.tagline}</p>

            {theme && (
              <p className="mt-3 flex items-center gap-2">
                <Badge tone="neutral">
                  {theme.name} theme
                </Badge>
              </p>
            )}

            <p className="mt-5 text-3xl font-bold">
              {formatPrice(product.priceCents, product.currency)}
            </p>
            <p className="mt-1">
              <Badge tone="emerald">One-time purchase</Badge>
            </p>

            <p className="mt-6 whitespace-pre-line text-sm text-black/70">{product.description}</p>
            {product.useCase && (
              <p className="mt-4 text-sm text-black/60">
                <span className="font-semibold text-black/80">Great for: </span>
                {product.useCase}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <AddToCartButton slug={product.slug}>Add to cart</AddToCartButton>
              <AddToCartButton
                slug={product.slug}
                then="checkout"
                className="rounded-xl border border-black/15 px-6 py-3 font-semibold hover:bg-black/5"
              >
                Buy now
              </AddToCartButton>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
