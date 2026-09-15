import Link from "next/link";
import type { ReactNode } from "react";
import { themeCssVars, type ThemeSkin } from "@/lib/themes";

/**
 * The frame every scan page renders in: the theme's skin, the wordmark and
 * tagline, the card, and a way to find out what this is.
 *
 * Shared by the real scan page and the demo, so the demo a visitor sees on the
 * home page is exactly what a finder would see.
 */
export function ScanLayout({
  children,
  skin,
  notice,
}: {
  children: ReactNode;
  skin: ThemeSkin;
  /** Shown above the card — the demo uses it to say it is a demo. */
  notice?: ReactNode;
}) {
  return (
    <div
      style={themeCssVars(skin) as React.CSSProperties}
      className="flex min-h-screen items-center justify-center bg-[var(--skin-bg)] px-4 py-10 text-[var(--skin-ink)]"
    >
      <div className="w-full max-w-sm">
        {notice}
        <div className="mb-4 text-center">
          <p className="text-xs font-semibold tracking-wide text-[var(--skin-accent)]">
            JOGAJOG EMERGENCY
          </p>
          {skin.tagline && (
            <p className="mt-1 text-[11px] text-[var(--skin-muted)]">{skin.tagline}</p>
          )}
        </div>
        <div className="rounded-2xl border border-[var(--skin-line)] bg-[var(--skin-surface)] p-6 shadow-sm">
          {children}
        </div>
        <p className="mt-4 text-center text-[11px] text-[var(--skin-muted)]">
          <Link href="/" className="hover:underline">
            What is Jogajog Emergency?
          </Link>
        </p>
      </div>
    </div>
  );
}
