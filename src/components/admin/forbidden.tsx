import Link from "next/link";
import { MascotShield } from "@/components/illustrations";

/**
 * What a signed-in admin sees on a console page their role doesn't cover.
 *
 * Rendered in place rather than redirecting, so someone following a link a
 * super admin shared understands why the page is empty instead of landing
 * somewhere unexpected.
 */
export function Forbidden({ need = "a super admin" }: { need?: string }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-dashed border-black/15 bg-white p-10 text-center">
      <MascotShield className="mx-auto h-16 w-16 text-[var(--color-primary)]" />
      <h1 className="mt-4 text-lg font-bold">This page is for {need}</h1>
      <p className="mt-2 text-sm text-black/60">
        Your admin role doesn&apos;t include this area. Ask a super admin if you need access.
      </p>
      <Link
        href="/admin"
        className="mt-5 inline-block rounded-xl bg-[var(--color-primary)] px-5 py-2 text-sm font-semibold text-white"
      >
        Back to overview
      </Link>
    </div>
  );
}
