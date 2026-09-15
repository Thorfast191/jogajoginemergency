"use client";

import { useEffect, useState } from "react";
import { themeCssVars, type ThemeSkin } from "@/lib/themes";
import { DEMO_VIEW } from "@/lib/demo-profile";
import { PublicProfileCard } from "@/components/public-profile-card";

const CYCLE_MS = 4500;

/**
 * A phone showing the demo scan page, cycling through the themes.
 *
 * It renders the same card a finder sees, with sample data. Cycling pauses
 * while the pointer or keyboard focus is on it, stops for good once someone
 * picks a theme, and never starts for anyone who prefers reduced motion.
 */
export function DemoPhone({ themes }: { themes: ThemeSkin[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [chosen, setChosen] = useState(false);

  useEffect(() => {
    if (themes.length < 2 || paused || chosen) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % themes.length), CYCLE_MS);
    return () => window.clearInterval(timer);
  }, [themes.length, paused, chosen]);

  const skin = themes[index];
  if (!skin) return null;

  return (
    <div
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="flex flex-col items-center"
    >
      <div className="relative w-[18.5rem] max-w-full rounded-[2.6rem] border-[10px] border-[#1c1917] bg-[#1c1917] shadow-2xl">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1c1917]" aria-hidden />
        <div
          key={skin.slug}
          style={themeCssVars(skin) as React.CSSProperties}
          className="anim-swap h-[34rem] overflow-hidden rounded-[2rem] bg-[var(--skin-bg)] px-3 pb-4 pt-9 text-[var(--skin-ink)]"
        >
          <div className="mb-2 text-center">
            <p className="text-[10px] font-semibold tracking-wide text-[var(--skin-accent)]">JOGAJOG EMERGENCY</p>
            <p className="mt-0.5 truncate text-[10px] text-[var(--skin-muted)]">{skin.tagline}</p>
          </div>
          <div className="origin-top scale-[0.9] rounded-2xl border border-[var(--skin-line)] bg-[var(--skin-surface)] p-4 shadow-sm">
            <PublicProfileCard view={DEMO_VIEW} shortCode="demo" mascot={skin.mascot} demo />
          </div>
        </div>
      </div>

      {themes.length > 1 && (
        <div className="mt-6 flex max-w-sm flex-wrap justify-center gap-2" role="group" aria-label="Preview a theme">
          {themes.map((t, i) => (
            <button
              key={t.slug}
              type="button"
              aria-pressed={i === index}
              onClick={() => {
                setIndex(i);
                setChosen(true);
              }}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                i === index ? "border-[var(--color-primary)] bg-white shadow-sm" : "border-black/10 bg-white/60 hover:bg-white"
              }`}
            >
              <span aria-hidden className="h-3 w-3 rounded-full ring-1 ring-black/10" style={{ background: t.accentColor }} />
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
