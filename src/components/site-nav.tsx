import Link from "next/link";
import { auth } from "@/lib/auth";

export async function SiteNav() {
  const session = await auth();

  return (
    <header className="border-b border-black/10 bg-white/80 backdrop-blur sticky top-0 z-40">
      <nav className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          Jogajog <span className="text-emerald-600">Emergency</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/pricing" className="hidden sm:inline hover:text-emerald-600">
            Pricing
          </Link>
          {session?.user ? (
            <Link
              href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
              className="rounded-md bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-emerald-600">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700"
              >
                Get a tag
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
