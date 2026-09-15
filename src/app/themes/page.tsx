import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { prisma } from "@/lib/prisma";
import { themeCssVars, type ThemeSkin } from "@/lib/themes";
import { DEFAULT_THEME_SLUG } from "@/lib/theme-access";
import { EmptyState, Badge } from "@/components/ui";
import { EmptyTags } from "@/components/illustrations";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const themes = await prisma.theme.findMany({
    where: { status: "ACTIVE" },
    orderBy: { sortOrder: "asc" },
    include: { products: { where: { status: "ACTIVE" }, select: { slug: true, name: true } } },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="bg-wash border-b border-black/5">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center">
            <h1 className="anim-pop text-3xl font-bold sm:text-5xl">Pick a look</h1>
            <p className="anim-pop mx-auto mt-4 max-w-2xl text-black/60">
              A theme is the artwork printed around your QR code and the look of the page a finder
              sees. Each comes with the sticker that carries it — and everyone gets the Jogajog
              Emergency theme free.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 py-12">
          {themes.length === 0 ? (
            <div className="mx-auto max-w-md">
              <EmptyState illustration={<EmptyTags />} title="Themes coming soon" />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {themes.map((t, i) => (
                <Reveal key={t.id} delay={i * 70}>
                  <div
                    style={themeCssVars(t as ThemeSkin) as React.CSSProperties}
                    className="group h-full overflow-hidden rounded-2xl border border-black/10 bg-white hover-lift"
                  >
                    <div className="overflow-hidden bg-[var(--skin-bg)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/themes/${t.id}/preview`}
                        alt={`The ${t.name} sticker with a sample QR code in its centre`}
                        loading="lazy"
                        className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="font-bold">{t.name}</h2>
                        {t.slug === DEFAULT_THEME_SLUG && <Badge tone="emerald">Free</Badge>}
                      </div>
                      <p className="mt-1 text-sm text-black/60">{t.tagline}</p>
                      <p className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/demo?theme=${t.slug}`}
                          className="rounded-full bg-[var(--skin-accent)] px-3 py-1 text-xs font-semibold text-[var(--skin-on-accent)]"
                        >
                          Preview scan page
                        </Link>
                        {t.products.map((p) => (
                          <Link
                            key={p.slug}
                            href={`/shop/${p.slug}`}
                            className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:border-[var(--skin-accent)]"
                          >
                            {p.name}
                          </Link>
                        ))}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
