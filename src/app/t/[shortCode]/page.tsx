import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { hashIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";
import { buildPublicProfileView } from "@/lib/public-profile";
import { resolveScanTheme, themeCssVars, type ThemeSkin } from "@/lib/themes";
import { userIsEntitled } from "@/lib/subscription";
import { PublicProfileCard } from "@/components/public-profile-card";
import { ThemeMascot } from "@/components/illustrations";
import { ReportAbuseLink } from "./report-abuse-link";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;

  const tag = await prisma.tag.findUnique({
    where: { shortCode },
    include: {
      theme: true,
      user: {
        include: {
          emergencyProfile: {
            include: {
              contacts: { orderBy: { sortOrder: "asc" } },
              links: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!tag || tag.status === "DEACTIVATED") {
    notFound();
  }

  // Scan logging — hashed IP only, rate-limited.
  const ip = await getClientIp();
  const { allowed } = rateLimit(`scan:${ip}`, { limit: 30, windowMs: 60_000 });
  if (allowed) {
    const h = await headers();
    await prisma.scanEvent.create({
      data: {
        tagId: tag.id,
        ipHash: hashIp(ip),
        userAgent: h.get("user-agent")?.slice(0, 300),
      },
    });
  }

  const profile = tag.user?.emergencyProfile ?? null;
  const notReady =
    tag.status === "UNASSIGNED" || tag.status === "ALLOCATED" || !tag.user || !profile;

  // The paid tier only ever adds to this page. A lapsed subscription drops the
  // portfolio and degrades a premium skin; it never withholds emergency or
  // medical information from whoever is standing over the item.
  const entitled = tag.user ? await userIsEntitled(tag.user.id) : false;
  const skin = resolveScanTheme(tag.theme as ThemeSkin | null, entitled);

  if (notReady) {
    return (
      <ScanLayout skin={skin}>
        <div className="text-center">
          <ThemeMascot mascot={skin.mascot} className="w-20 h-20 mx-auto anim-float" />
          <h1 className="mt-3 text-xl font-semibold">This tag isn&apos;t set up yet</h1>
          <p className="mt-2 text-sm opacity-60">
            Its owner hasn&apos;t added their emergency information yet. If you found an item with
            this sticker, please hold onto it — the owner will likely activate it soon.
          </p>
        </div>
      </ScanLayout>
    );
  }

  const view = buildPublicProfileView(profile, profile.contacts, profile.links, {
    lost: tag.status === "LOST",
    entitled,
  });

  return (
    <ScanLayout skin={skin}>
      <PublicProfileCard view={view} shortCode={shortCode} mascot={skin.mascot} />
      <div className="mt-2 text-center">
        <ReportAbuseLink shortCode={shortCode} />
      </div>
    </ScanLayout>
  );
}

function ScanLayout({ children, skin }: { children: React.ReactNode; skin: ThemeSkin }) {
  return (
    <div
      // The skin colours the frame. It deliberately does not touch the
      // emergency block's own contrast — see PublicProfileCard.
      style={themeCssVars(skin) as React.CSSProperties}
      className="min-h-screen flex items-center justify-center px-4 py-10 bg-[var(--skin-bg)] text-[var(--skin-ink)]"
    >
      <div className="w-full max-w-sm">
        <p className="text-center text-xs font-semibold tracking-wide text-[var(--skin-accent)] mb-4">
          JOGAJOG EMERGENCY
        </p>
        <div className="rounded-2xl border border-black/10 bg-[var(--skin-surface)] p-6 shadow-sm">
          {children}
        </div>
        <p className="mt-4 text-center text-[11px] opacity-40">
          <Link href="/" className="hover:underline">
            What is Jogajog Emergency?
          </Link>
        </p>
      </div>
    </div>
  );
}
