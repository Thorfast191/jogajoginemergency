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
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ theme?: string | string[] }>;
}) {
  const { slug } = await params;
  const [product, skins, settings] = await Promise.all([
    prisma.product.findUnique({ where: { slug }, include: { theme: true } }),
    prisma.theme.findMany({ where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    getSettings(),
  ]);
  if (!product || product.status !== "ACTIVE") notFound();

  // Only a live theme has a public preview image. With a drafted or archived
  // theme the page falls back to the product's own photo rather than showing a
  // broken image to a shopper.
  const productTheme =
    product.theme && product.theme.status === "ACTIVE"
      ? (product.theme as ThemeSkin & { id: string })
      : null;

  // The artwork is a choice, carried in the URL so the preview is server
  // rendered and the swatches are plain links — the picker works with no
  // JavaScript at all. An unknown slug falls back to the product's own theme.
  const asked = (await searchParams).theme;
  const askedSlug = Array.isArray(asked) ? asked[0] : asked;
  const picked = askedSlug ? skins.find((t) => t.slug === askedSlug) : undefined;
  const theme = (picked as (ThemeSkin & { id: string }) | undefined) ?? productTheme;

  // Only send a theme to the cart when it isn't the one the product already
  // carries — a line with no theme means "whatever this product comes with".
  const chosenForCart = theme && theme.id !== productTheme?.id ? theme.slug : null;

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

            {skins.length > 1 && (
              <div className="mt-7">
                <p className="text-sm font-semibold">Choose the artwork</p>
                <p className="mt-0.5 text-xs text-black/50">
                  This is what gets printed, and the skin your scan page wears. The theme you buy is
                  yours to keep.
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {skins.map((option) => {
                    const on = option.id === theme?.id;
                    return (
                      <li key={option.id}>
                        <Link
                          href={`/shop/${product.slug}?theme=${option.slug}`}
                          aria-current={on ? "true" : undefined}
                          style={themeCssVars(option as ThemeSkin) as React.CSSProperties}
                          className={`flex items-center gap-2 rounded-xl border-2 py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors ${
                            on
                              ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                              : "border-black/10 hover:border-black/25"
                          }`}
                        >
                          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--skin-bg)]">
                            <ThemeMascot
                              mascot={option.mascot}
                              className="h-5 w-5 text-[var(--skin-accent)]"
                            />
                          </span>
                          {option.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {settings.ordersPaused && (
              <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {settings.ordersPausedMessage ?? "We're not taking new orders right now."} Your cart
                is saved for when we reopen.
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <AddToCartButton slug={product.slug} theme={chosenForCart}>
                Add to cart
              </AddToCartButton>
              {/* "Buy now" goes straight to checkout, which is the one thing a
                  pause turns off — offering it would be a promise we refuse. */}
              {!settings.ordersPaused && (
                <AddToCartButton
                  slug={product.slug}
                  theme={chosenForCart}
                  then="checkout"
                  className="rounded-xl border border-black/15 px-6 py-3 font-semibold hover:bg-black/5"
                >
                  Buy now
                </AddToCartButton>
              )}
            </div>

            <ol className="mt-10 space-y-3 rounded-2xl border border-black/10 bg-white p-5 text-sm">
              {[
                "Pay once — the sticker and its QR codes are yours.",
                "Your QR codes are made as soon as you pay; we print them into the centre and ship.",
                theme
                  ? `Your scan page wears the ${theme.name} theme — you can switch it any time.`
                  : "Your scan page wears the free Jogajog Emergency theme.",
                "Add a plan at checkout and your page is published the moment you pay.",
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
