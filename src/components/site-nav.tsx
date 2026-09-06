import Link from "next/link";
import { auth } from "@/lib/auth";
import { readCart } from "@/lib/cart-server";
import { cartCount } from "@/lib/cart";

export async function SiteNav() {
  const [session, cart] = await Promise.all([auth(), readCart()]);
  const count = cartCount(cart);

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[var(--background)]/85 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight hover-wiggle">
          Jogajog <span className="text-[var(--color-primary)]">Emergency</span>
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/shop" className="hidden font-medium hover:text-[var(--color-primary)] sm:inline">
            Shop
          </Link>
          <Link href="/themes" className="hidden font-medium hover:text-[var(--color-primary)] sm:inline">
            Themes
          </Link>
          <Link
            href="/cart"
            className="relative rounded-lg px-2 py-1 font-medium hover:bg-black/5"
            aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
          >
            Cart
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--color-accent)] px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          {session?.user ? (
            <Link
              href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
              className="rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-white transition-transform hover:scale-[1.03]"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="font-medium hover:text-[var(--color-primary)]">
                Log in
              </Link>
              <Link
                href="/shop"
                className="rounded-xl bg-[var(--color-primary)] px-4 py-2 font-semibold text-white transition-transform hover:scale-[1.03]"
              >
                Get a tag
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
