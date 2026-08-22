import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const plans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { priceCents: "asc" },
  });
  const defaultPlanSlug = plan && plans.some((p) => p.slug === plan) ? plan : plans[0]?.slug ?? "";

  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-center">Create your account</h1>
        <p className="mt-2 text-sm text-black/60 text-center">
          Already have one?{" "}
          <Link href="/login" className="text-emerald-600 hover:underline">
            Log in
          </Link>
        </p>
        <div className="mt-8">
          <SignupForm plans={plans} defaultPlanSlug={defaultPlanSlug} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
