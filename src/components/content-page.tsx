import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

/** The frame for plain content pages: About, Contact, Privacy, Terms. */
export function ContentPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="flex-1">
        <section className="bg-wash border-b border-black/5">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:py-20">
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-5xl anim-pop">
              {title}
            </h1>
            {intro && <div className="mt-4 text-lg text-black/60 text-balance">{intro}</div>}
          </div>
        </section>
        <div className="mx-auto max-w-3xl px-4 py-12">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** A titled block inside a content page. */
export function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-black/70">{children}</div>
    </section>
  );
}
