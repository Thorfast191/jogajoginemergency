import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { isSafeNext } from "@/lib/nav";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = isSafeNext(next) ? next! : undefined;
  const signupHref = safeNext ? `/signup?next=${encodeURIComponent(safeNext)}` : "/signup";

  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-center">Log in</h1>
        <p className="mt-2 text-sm text-black/60 text-center">
          No account yet?{" "}
          <Link href={signupHref} className="text-emerald-600 hover:underline">
            Sign up
          </Link>
        </p>
        <div className="mt-8">
          <LoginForm next={safeNext} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
