import Link from "next/link";
import type { ReactNode } from "react";
import { themeCssVars, type ThemeSkin } from "@/lib/themes";

/**
 * The frame every scan page renders in: the theme's skin, the wordmark and
 * tagline, a Call 999 action, the card, the emergency wording and a way to
 * find out what this is.
 *
 * Shared by the real scan page, the unknown-tag page and the demo, so the demo
 * a visitor sees on the home page is exactly what a finder would see.
 */
export function ScanLayout({
  children,
  skin,
  notice,
  demo = false,
}: {
  children: ReactNode;
  skin: ThemeSkin;
  /** Shown above the card — the demo uses it to say it is a demo. */
  notice?: ReactNode;
  /** Sample page: the 999 button is shown but must not dial anyone. */
  demo?: boolean;
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
        <Call999 demo={demo} />
        <div className="rounded-2xl border border-[var(--skin-line)] bg-[var(--skin-surface)] p-6 shadow-sm">
          {children}
        </div>
        <p className="mt-4 text-center text-[11px] leading-relaxed text-[var(--skin-muted)]">
          In an emergency, call 999 first. Jogajog Emergency is a contact aid, not an emergency
          response provider. Information in the profile is supplied by the account holder and may be
          incomplete or incorrect.
        </p>
        <p className="mt-3 text-center text-[11px] text-[var(--skin-muted)]">
          <Link href="/" className="hover:underline">
            What is Jogajog Emergency?
          </Link>
        </p>
      </div>
    </div>
  );
}

/**
 * Bangladesh's national emergency number, as a direct action above everything
 * else. Fixed colours rather than the theme's: it must read as an emergency
 * button whatever skin the sticker carries.
 */
function Call999({ demo }: { demo: boolean }) {
  const className =
    "mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#B91C1C] px-4 py-4 text-lg font-bold text-white shadow-sm";
  if (demo) {
    return (
      <div className={className} aria-label="Call 999 (disabled on the demo)">
        Call 999 <span className="text-xs font-medium opacity-80">(demo, doesn&apos;t dial)</span>
      </div>
    );
  }
  return (
    <a href="tel:999" className={`${className} hover:bg-[#991B1B] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#B91C1C]`}>
      Call 999 · Emergency services
    </a>
  );
}
