import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { themeCssVars, type ThemeSkin } from "@/lib/themes";
import { ThemeMascot } from "@/components/illustrations";
import { ThemeForm } from "../theme-form";
import { ArchiveThemeButton } from "./archive-button";

export const dynamic = "force-dynamic";

export default async function AdminThemeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const theme = await prisma.theme.findUnique({
    where: { id },
    include: { _count: { select: { products: true, tags: true } } },
  });
  if (!theme) notFound();

  return (
    <div>
      <Link href="/admin/themes" className="text-sm text-black/50 hover:underline">
        ← Back to themes
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{theme.name}</h1>
      <p className="text-sm text-black/50">
        {theme._count.products} products · {theme._count.tags} tags using this skin
      </p>

      <div
        style={themeCssVars(theme as ThemeSkin) as React.CSSProperties}
        className="mt-4 grid h-40 max-w-2xl place-items-center rounded-xl border border-black/10 bg-[var(--skin-bg)]"
      >
        <ThemeMascot mascot={theme.mascot} className="h-24 w-24 text-[var(--skin-accent)] anim-float" />
      </div>

      <div className="mt-6">
        <ThemeForm theme={theme} />
      </div>

      {theme.status !== "ARCHIVED" && (
        <div className="mt-10 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Archive this theme</p>
          <p className="mt-1 text-sm text-amber-800">
            Hides it from the store and the customer picker. The {theme._count.tags} tags already
            using it keep rendering — pulling a skin out from under an existing sticker would change
            what a stranger sees with no warning.
          </p>
          <div className="mt-3">
            <ArchiveThemeButton id={theme.id} />
          </div>
        </div>
      )}
    </div>
  );
}
