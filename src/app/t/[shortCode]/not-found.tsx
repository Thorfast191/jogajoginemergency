import type { Metadata } from "next";
import Link from "next/link";
import { resolveScanTheme } from "@/lib/themes";
import { ScanLayout } from "@/components/scan-layout";

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

/**
 * A scanned code we don't recognise, or one its owner or support has switched
 * off. The person holding the phone may be standing over an accident, so this
 * still leads with 999 and says plainly what happened, rather than a bare 404.
 */
export default function UnknownTag() {
  return (
    <ScanLayout skin={resolveScanTheme(null)}>
      <div className="text-center">
        <h1 className="text-lg font-bold">This code isn&apos;t active</h1>
        <p className="mt-2 text-sm text-[var(--skin-muted)]">
          It may have been switched off by its owner, or mistyped. No owner details can be shown for
          it.
        </p>
        <p className="mt-4 text-sm">
          If anyone is hurt, call <strong>999</strong> now.
        </p>
        <p className="mt-4 text-sm text-[var(--skin-muted)]">
          Typed the ID from a sticker? Check it letter by letter. Capitals matter. Still stuck?{" "}
          <Link href="/contact" className="font-semibold text-[var(--skin-accent)] hover:underline">
            Contact support
          </Link>
          .
        </p>
      </div>
    </ScanLayout>
  );
}
