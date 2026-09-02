import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { isSafeNext } from "@/lib/nav";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = isSafeNext(next) ? next! : undefined;
  const loginHref = safeNext ? `/login?next=${encodeURIComponent(safeNext)}` : "/login";

  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-center">Create your account</h1>
        <p className="mt-2 text-sm text-black/60 text-center">
          Already have one?{" "}
          <Link href={loginHref} className="text-emerald-600 hover:underline">
            Log in
          </Link>
        </p>
        <div className="mt-8">
          <SignupForm next={safeNext} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
