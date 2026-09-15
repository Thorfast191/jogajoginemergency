import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/session";
import { signOutAction } from "@/app/auth-actions";
import { SideNav, type SideNavSection } from "@/components/side-nav";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

const SECTIONS: SideNavSection[] = [
  { links: [{ href: "/dashboard", label: "Overview", icon: "home" }] },
  {
    heading: "My page",
    links: [
      { href: "/dashboard/tags", label: "My QR codes", icon: "qr" },
      { href: "/dashboard/profile", label: "Emergency profile", icon: "user" },
      { href: "/dashboard/privacy", label: "Privacy", icon: "lock" },
      { href: "/dashboard/messages", label: "Messages", icon: "message" },
    ],
  },
  {
    heading: "Account",
    links: [
      { href: "/dashboard/subscription", label: "Plan", icon: "card" },
      { href: "/dashboard/orders", label: "Orders", icon: "receipt" },
      { href: "/dashboard/settings", label: "Settings", icon: "settings" },
    ],
  },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireActiveUser();
  if (!user) redirect("/login");

  if (user.role !== "USER") {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f6f3] md:flex-row">
      <SideNav
        rootHref="/dashboard"
        sections={SECTIONS}
        brand={
          <Link href="/" className="font-bold tracking-tight">
            Jogajog <span className="text-[var(--color-primary)]">Emergency</span>
          </Link>
        }
        footer={
          <div className="flex flex-col gap-0.5">
            <Link
              href="/shop"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/[0.04]"
            >
              <Icon name="cart" className="text-black/40" />
              Buy a sticker
            </Link>
            <p className="truncate px-3 pt-1 text-xs text-black/40">{user.email}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-black/70 hover:bg-black/[0.04]"
              >
                <Icon name="logout" className="text-black/40" />
                Log out
              </button>
            </form>
          </div>
        }
      />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
