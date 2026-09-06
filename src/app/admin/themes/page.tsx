import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { themeCssVars, type ThemeSkin } from "@/lib/themes";
import { ThemeMascot } from "@/components/illustrations";
import { ThemeForm } from "./theme-form";

export const dynamic = "force-dynamic";

export default async function AdminThemesPage() {
  const themes = await prisma.theme.findMany({
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
    include: { _count: { select: { products: true, tags: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Themes</h1>
      <p className="mt-1 text-sm text-black/60">
        A theme sets a sticker&apos;s printed artwork and the skin of every scan page using it.
        Keep them original — no licensed characters.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {themes.map((t) => (
          <div key={t.id} className="overflow-hidden rounded-xl border border-black/10 bg-white">
            <div
              style={themeCssVars(t as ThemeSkin) as React.CSSProperties}
              className="grid h-28 place-items-center bg-[var(--skin-bg)]"
            >
              <ThemeMascot mascot={t.mascot} className="h-16 w-16 text-[var(--skin-accent)]" />
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{t.name}</p>
                
              </div>
              <p className="mt-0.5 font-mono text-xs text-black/40">{t.slug}</p>
              <p className="mt-1 text-xs text-black/50">
                {t.status} · {t._count.products} products · {t._count.tags} tags
              </p>
              <Link
                href={`/admin/themes/${t.id}`}
                className="mt-2 inline-block text-xs font-medium text-emerald-700 hover:underline"
              >
                Edit →
              </Link>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="font-semibold">New theme</h2>
        <div className="mt-3">
          <ThemeForm />
        </div>
      </div>
    </div>
  );
}
