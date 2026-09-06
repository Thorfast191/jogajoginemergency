import type { ReactNode } from "react";
import { formatPrice } from "@/lib/money";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-black/10 bg-[var(--color-surface)] p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-black/60">{subtitle}</p>}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-black/40">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

const TONES: Record<string, string> = {
  neutral: "bg-black/[0.06] text-black/60",
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  grape: "bg-violet-100 text-violet-700",
  sky: "bg-sky-100 text-sky-700",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone] ?? TONES.neutral}`}
    >
      {children}
    </span>
  );
}

export function Price({ cents, currency }: { cents: number; currency: string }) {
  return (
    <span>
      <span className="font-bold">{formatPrice(cents, currency)}</span>
      <span className="text-black/40"> · one-time</span>
    </span>
  );
}

export function EmptyState({
  illustration,
  title,
  children,
}: {
  illustration: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 p-10 text-center">
      <div className="flex justify-center anim-float">{illustration}</div>
      <p className="mt-4 font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-black/60">{children}</div>}
    </div>
  );
}

/** The primary call to action, used across the marketing site and store. */
export function ButtonLinkClass(size: "sm" | "md" = "md"): string {
  const pad = size === "sm" ? "px-4 py-2 text-sm" : "px-6 py-3";
  return `inline-block rounded-xl bg-[var(--color-primary)] text-white font-semibold ${pad} transition-transform hover:scale-[1.03] active:scale-[0.98]`;
}
