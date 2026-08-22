import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-center">Log in</h1>
        <p className="mt-2 text-sm text-black/60 text-center">
          No account yet?{" "}
          <Link href="/signup" className="text-emerald-600 hover:underline">
            Sign up
          </Link>
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
