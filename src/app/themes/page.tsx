import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";
import { themeCssVars, type ThemeSkin } from "@/lib/themes";
import { ThemeMascot } from "@/components/illustrations";
import { EmptyState } from "@/components/ui";
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
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14">
        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Pick a look</h1>
          <p className="mx-auto mt-3 max-w-xl text-black/60">
            A theme sets both the artwork printed on your sticker and the page a finder sees when
            they scan it. Each theme comes with the sticker that carries it — and every account
            starts with the Jogajog Emergency skin, free forever.
          </p>
        </div>

        {themes.length === 0 ? (
          <div className="mx-auto mt-12 max-w-md">
            <EmptyState illustration={<EmptyTags />} title="Themes coming soon" />
          </div>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 anim-stagger">
            {themes.map((t) => (
              <div
                key={t.id}
                style={themeCssVars(t as ThemeSkin) as React.CSSProperties}
                className="overflow-hidden rounded-2xl border border-black/10 hover-lift"
              >
                <div className="grid h-44 place-items-center bg-[var(--skin-bg)]">
                  <ThemeMascot
                    mascot={t.mascot}
                    className="h-24 w-24 text-[var(--skin-accent)] anim-float"
                  />
                </div>
                <div className="bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-bold">{t.name}</h2>

                  </div>
                  <p className="mt-1 text-sm text-black/60">{t.tagline}</p>
                  {t.products.length > 0 && (
                    <p className="mt-3 flex flex-wrap gap-2">
                      {t.products.map((p) => (
                        <Link
                          key={p.slug}
                          href={`/shop/${p.slug}`}
                          className="rounded-full border border-black/15 px-3 py-1 text-xs font-medium hover:border-[var(--skin-accent)] hover:text-[var(--skin-accent)]"
                        >
                          {p.name}
                        </Link>
                      ))}
                    </p>
                  )}
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
