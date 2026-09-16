import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ThemeMascot } from "@/components/illustrations";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { themeCssVars, type ThemeSkin } from "@/lib/themes";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({ where: { slug }, include: { theme: true } });
  if (!product || product.status !== "ACTIVE") notFound();

  // Only a live theme has a public preview image. With a drafted or archived
  // theme the page falls back to the product's own photo rather than showing a
  // broken image to a shopper.
  const theme =
    product.theme && product.theme.status === "ACTIVE"
      ? (product.theme as ThemeSkin & { id: string })
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-14">
        <Link href="/shop" className="text-sm text-black/50 hover:underline">
          ← Back to shop
        </Link>

        <div className="mt-4 grid gap-10 md:grid-cols-2">
          <div>
            <div
              style={theme ? (themeCssVars(theme) as React.CSSProperties) : undefined}
              className="anim-pop overflow-hidden rounded-3xl border border-black/10 bg-[var(--skin-bg,#f7f7f7)] shadow-sm"
            >
              {theme ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/themes/${theme.id}/preview`}
                  alt={`${product.name} in the ${theme.name} theme, with a sample QR code in the centre`}
                  className="aspect-square w-full object-cover"
                />
              ) : product.imageAssetId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/media/${product.imageAssetId}`} alt={product.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="grid aspect-square w-full place-items-center">
                  <ThemeMascot mascot={null} className="h-40 w-40 text-[#0f9d76] anim-float" />
                </div>
              )}
            </div>
            {theme && (
              <p className="mt-3 flex items-center justify-center gap-2 text-sm text-black/60">
                <Icon name="qr" width={16} height={16} className="text-[var(--color-primary)]" />
                The sample code shown is replaced by your own QR.
              </p>
            )}
            {theme && product.imageAssetId && (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/media/${product.imageAssetId}`} alt="" className="h-16 w-16 rounded-xl object-cover" />
                <p className="text-sm text-black/60">Product photo</p>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <p className="mt-1 text-black/60">{product.tagline}</p>

            <p className="mt-3 flex flex-wrap items-center gap-2">
              {theme && <Badge tone="neutral">{theme.name} theme</Badge>}
              <Badge tone="sky">
                {product.qrSlots} QR {product.qrSlots === 1 ? "code" : "codes"}
              </Badge>
              <Badge tone="grape">{product.stickerWidthMm} mm wide</Badge>
            </p>

            <p className="mt-5 text-3xl font-bold">{formatPrice(product.priceCents, product.currency)}</p>
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

            <ol className="mt-10 space-y-3 rounded-2xl border border-black/10 bg-white p-5 text-sm">
              {[
                "Pay once — the sticker and its QR codes are yours.",
                "Generate your QR in your dashboard; we print it into the centre and ship it.",
                theme
                  ? `Your scan page wears the ${theme.name} theme — you can switch it any time.`
                  : "Your scan page wears the free Jogajog Emergency theme.",
                "A plan publishes what you choose to share when someone scans it.",
              ].map((line, i) => (
                <li key={line} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-primary)]/10 text-xs font-bold text-[var(--color-primary-dark)]">
                    {i + 1}
                  </span>
                  {line}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
