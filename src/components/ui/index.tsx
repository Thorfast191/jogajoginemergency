import type { ReactNode } from "react";
import { formatPrice } from "@/lib/money";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-black/10 bg-white p-4 ${className}`}>{children}</div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{title}</h1>
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
      <label htmlFor={htmlFor} className="block text-sm font-medium mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-black/40">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "emerald" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-black/10 text-black/60",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function Price({ cents, currency }: { cents: number; currency: string }) {
  return (
    <span>
      <span className="font-semibold">{formatPrice(cents, currency)}</span>
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
    <div className="rounded-lg border border-dashed border-black/15 p-8 text-center">
      <div className="flex justify-center">{illustration}</div>
      <p className="mt-3 font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-black/60">{children}</div>}
    </div>
  );
}
