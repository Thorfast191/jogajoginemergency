import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/client-ip";
import { hashIp } from "@/lib/hash";
import { rateLimit } from "@/lib/rate-limit";
import { buildPublicProfileView } from "@/lib/public-profile";
import { PublicProfileCard } from "@/components/public-profile-card";
import { ReportAbuseLink } from "./report-abuse-link";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ shortCode: string }> }) {
  const { shortCode } = await params;

  const tag = await prisma.tag.findUnique({
    where: { shortCode },
    include: {
      user: {
        include: {
          emergencyProfile: { include: { contacts: { orderBy: { sortOrder: "asc" } } } },
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

  if (notReady) {
    return (
      <ScanLayout>
        <div className="text-center">
          <h1 className="text-xl font-semibold">This tag isn&apos;t set up yet</h1>
          <p className="mt-2 text-sm text-black/60">
            Its owner hasn&apos;t added their emergency information yet. If you found an item with
            this sticker, please hold onto it — the owner will likely activate it soon.
          </p>
        </div>
      </ScanLayout>
    );
  }

  const view = buildPublicProfileView(profile, profile.contacts, {
    lost: tag.status === "LOST",
  });

  return (
    <ScanLayout>
      <PublicProfileCard view={view} shortCode={shortCode} />
      <div className="mt-2 text-center">
        <ReportAbuseLink shortCode={shortCode} />
      </div>
    </ScanLayout>
  );
}

function ScanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black/[0.02] px-4 py-10">
      <div className="w-full max-w-sm">
        <p className="text-center text-xs font-medium text-emerald-600 mb-4">JOGAJOG EMERGENCY</p>
        <div className="rounded-xl border border-black/10 bg-white p-6">{children}</div>
        <p className="mt-4 text-center text-[11px] text-black/40">
          <Link href="/" className="hover:underline">
            What is Jogajog Emergency?
          </Link>
        </p>
      </div>
    </div>
  );
}
