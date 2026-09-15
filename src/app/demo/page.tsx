import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolveScanTheme, type ThemeSkin } from "@/lib/themes";
import { DEMO_VIEW } from "@/lib/demo-profile";
import { PublicProfileCard } from "@/components/public-profile-card";
import { ScanLayout } from "@/components/scan-layout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Demo scan page — Jogajog Emergency",
  description: "What a finder sees when they scan a Jogajog Emergency sticker.",
  robots: { index: false, follow: true },
};

/**
 * What a finder sees, with sample data. Every sample QR on the site (theme
 * previews, shop cards) points here, optionally in a theme: /demo?theme=slug.
 */
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string }>;
}) {
  const { theme: slug } = await searchParams;
  const theme = slug
    ? await prisma.theme.findFirst({ where: { slug, status: "ACTIVE" } }).catch(() => null)
    : null;
  const skin = resolveScanTheme(theme as ThemeSkin | null);

  return (
    <ScanLayout
      skin={skin}
      notice={
        <div className="mb-5 rounded-2xl bg-[var(--skin-surface)] px-4 py-3 text-center text-xs shadow-sm ring-1 ring-[var(--skin-line)]">
          <p className="font-semibold">This is a demo with sample information.</p>
          <p className="mt-1 text-[var(--skin-muted)]">
            On your own sticker, you choose every field a finder can see.{" "}
            <Link href="/shop" className="font-semibold text-[var(--skin-accent)] hover:underline">
              Get yours →
            </Link>
          </p>
        </div>
      }
    >
      <PublicProfileCard view={DEMO_VIEW} shortCode="demo" mascot={skin.mascot} demo />
    </ScanLayout>
  );
}
