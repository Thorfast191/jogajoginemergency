"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";

export type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string): boolean {
  if (href.includes("#")) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** The public site's links, highlighted for the page you're on. Desktop only. */
export function SiteNavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const on = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              on
                ? "bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]"
                : "text-black/70 hover:bg-black/5 hover:text-black"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

/** The same links, plus the account buttons, in a drop-down for small screens. */
export function SiteMobileMenu({
  items,
  account,
}: {
  items: NavItem[];
  account: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="site-mobile-menu"
        className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5"
      >
        <Icon name={open ? "close" : "menu"} width={20} height={20} />
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
      </button>
      {open && (
        <div
          id="site-mobile-menu"
          className="anim-pop absolute inset-x-0 top-full border-b border-black/10 bg-[var(--background)] px-4 pb-5 pt-2 shadow-lg"
        >
          <nav className="flex flex-col">
            {[...items, ...account].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(pathname, item.href) ? "page" : undefined}
                className="rounded-lg px-3 py-3 text-base font-medium hover:bg-black/5"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
