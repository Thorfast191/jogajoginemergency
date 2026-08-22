import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteNav />
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold text-center">Reset your password</h1>
        <p className="mt-2 text-sm text-black/60 text-center">
          Remembered it?{" "}
          <Link href="/login" className="text-emerald-600 hover:underline">
            Log in
          </Link>
        </p>
        <div className="mt-8">
          <ForgotPasswordForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
