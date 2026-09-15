"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

export type SideNavLink = { href: string; label: string; icon: IconName };
export type SideNavSection = { heading?: string; links: SideNavLink[] };

/**
 * The sidebar shared by the customer dashboard and the admin console.
 *
 * Only data crosses into this client component — the layouts decide which
 * links a viewer may see (the console filters by permission) and pass the
 * sign-out form in as `footer`, so nothing here knows about roles.
 */
export function SideNav({
  brand,
  sections,
  footer,
  rootHref,
}: {
  brand: ReactNode;
  sections: SideNavSection[];
  footer: ReactNode;
  /** The overview link, which is only active on an exact match. */
  rootHref: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const active = (href: string) =>
    href === rootHref ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="sticky top-0 z-30 flex shrink-0 flex-col border-b border-black/10 bg-white md:h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-14 items-center justify-between px-4 md:h-auto md:py-5">
        {brand}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="side-nav-links"
          className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5 md:hidden"
        >
          <Icon name={open ? "close" : "menu"} width={20} height={20} />
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        </button>
      </div>

      <div
        id="side-nav-links"
        className={`${open ? "flex" : "hidden"} max-h-[calc(100vh-3.5rem)] flex-1 flex-col overflow-y-auto px-3 pb-4 md:flex md:max-h-none`}
      >
        <nav className="flex flex-col gap-5">
          {sections.map((section, i) => (
            <div key={section.heading ?? i} className="flex flex-col gap-0.5">
              {section.heading && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-black/35">
                  {section.heading}
                </p>
              )}
              {section.links.map((l) => {
                const on = active(l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={on ? "page" : undefined}
                    className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                      on
                        ? "bg-[var(--color-primary)]/10 font-semibold text-[var(--color-primary-dark)]"
                        : "text-black/70 hover:bg-black/[0.04] hover:text-black"
                    }`}
                  >
                    <Icon
                      name={l.icon}
                      className={on ? "text-[var(--color-primary)]" : "text-black/40 group-hover:text-black/70"}
                    />
                    {l.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="mt-6 border-t border-black/10 pt-4 md:mt-auto">{footer}</div>
      </div>
    </aside>
  );
}
