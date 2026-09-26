import Link from "next/link";
import { requireActiveUser } from "@/lib/session";
import { readLiveCart } from "@/lib/cart-server";
import { cartCount } from "@/lib/cart";
import { isStaff } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { SiteMobileMenu, SiteNavLinks, type NavItem } from "@/components/site-nav-links";

const LINKS: NavItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/themes", label: "Themes" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/demo", label: "Live demo" },
];

export async function SiteNav() {
  // The role comes from the database, not the session token: a token outlives a
  // role change, and pointing "Dashboard" at /admin for someone who was just
  // demoted sends them on a pointless trip through the login page.
  const [user, cart, settings] = await Promise.all([requireActiveUser(), readLiveCart(), getSettings()]);
  const count = cartCount(cart.lines);

  const account: NavItem[] = user
    ? [{ href: isStaff(user.role) ? "/admin" : "/dashboard", label: "Dashboard" }]
    : [
        { href: "/login", label: "Log in" },
        { href: "/signup", label: "Create account" },
      ];

  return (
    <>
      {settings.announcement && (
        <div className="bg-[var(--color-primary)] px-4 py-2 text-center text-sm font-medium text-white">
          {settings.announcement}
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--background)]/85 backdrop-blur">
        <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight hover-wiggle">
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--color-primary)] text-white"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M12 6v12M6 12h12" />
              </svg>
            </span>
            <span>
              Jogajog <span className="text-[var(--color-primary)]">Emergency</span>
            </span>
          </Link>

          <SiteNavLinks items={LINKS} />

          <div className="flex items-center gap-2 text-sm">
            <Link
              href="/cart"
              className="relative rounded-lg px-2 py-1.5 font-medium hover:bg-black/5"
              aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
            >
              Cart
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-accent)] px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
            {user ? (
              <Link
                href={account[0].href}
                className="hidden rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-white transition-transform hover:scale-[1.03] sm:inline-block"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden rounded-lg px-2 py-1.5 font-medium hover:bg-black/5 sm:inline-block">
                  Log in
                </Link>
                <Link
                  href="/shop"
                  className="hidden rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-white transition-transform hover:scale-[1.03] sm:inline-block"
                >
                  Get a tag
                </Link>
              </>
            )}
            <SiteMobileMenu items={LINKS} account={account} />
          </div>
        </nav>
      </header>
    </>
  );
}
