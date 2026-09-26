import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveUser } from "@/lib/session";
import { can, isStaff, roleLabel, type Permission } from "@/lib/permissions";
import { signOutAction } from "@/app/auth-actions";
import { clientHref } from "@/lib/hosts";
import { SideNav, type SideNavSection } from "@/components/side-nav";
import { Icon, type IconName } from "@/components/icons";

export const dynamic = "force-dynamic";

type Entry = { href: string; label: string; icon: IconName; needs: Permission };

// Every console link names the permission its page checks, so the menu never
// offers a page that would only answer "not for you".
const SECTIONS: { heading?: string; links: Entry[] }[] = [
  { links: [{ href: "/admin", label: "Overview", icon: "home", needs: "console.view" }] },
  {
    heading: "Store",
    links: [
      { href: "/admin/orders", label: "Orders", icon: "cart", needs: "orders.manage" },
      { href: "/admin/products", label: "Products", icon: "box", needs: "catalog.edit" },
      { href: "/admin/themes", label: "Themes", icon: "palette", needs: "catalog.edit" },
    ],
  },
  {
    heading: "QR codes",
    links: [{ href: "/admin/tags", label: "Generated QR codes", icon: "qr", needs: "tags.manage" }],
  },
  {
    heading: "Customers",
    links: [
      { href: "/admin/users", label: "Users", icon: "users", needs: "users.manage" },
      { href: "/admin/subscriptions", label: "Subscriptions", icon: "card", needs: "console.view" },
      { href: "/admin/plans", label: "Plans", icon: "receipt", needs: "plans.edit" },
      { href: "/admin/payments", label: "Payments", icon: "wallet", needs: "money.manage" },
    ],
  },
  {
    heading: "Monitoring",
    links: [
      { href: "/admin/scans", label: "Scan activity", icon: "activity", needs: "console.view" },
      { href: "/admin/abuse-reports", label: "Abuse reports", icon: "flag", needs: "console.view" },
    ],
  },
  {
    heading: "Platform",
    links: [
      { href: "/admin/admins", label: "Admins", icon: "shield", needs: "admins.manage" },
      { href: "/admin/settings", label: "Settings", icon: "settings", needs: "settings.manage" },
      { href: "/admin/activity", label: "Activity log", icon: "list", needs: "settings.manage" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // No valid session (signed out, suspended, or a token revoked by a password
  // or role change) goes to log in; a signed-in customer goes to their own
  // area. Both decided from the database, not from the token.
  const admin = await requireActiveUser();
  if (!admin) redirect("/login?next=/admin");
  if (!isStaff(admin.role)) redirect(clientHref("/dashboard"));

  const sections: SideNavSection[] = SECTIONS.map((s) => ({
    heading: s.heading,
    links: s.links
      .filter((l) => can(admin.role, l.needs))
      .map(({ href, label, icon }) => ({ href, label, icon })),
  })).filter((s) => s.links.length > 0);

  const superAdmin = admin.role === "SUPER_ADMIN";

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f6f3] md:flex-row">
      <SideNav
        rootHref="/admin"
        sections={sections}
        brand={
          <Link href="/admin" className="block">
            <span className="font-bold tracking-tight">
              Jogajog <span className="text-[var(--color-primary)]">Control</span>
            </span>
            <span
              className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide ${
                superAdmin ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
              }`}
            >
              {roleLabel(admin.role)}
            </span>
          </Link>
        }
        footer={
          <div className="flex flex-col gap-0.5">
            <Link
              href="/admin/profile"
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-black/70 hover:bg-black/[0.04]"
            >
              <Icon name="user" className="text-black/40" />
              <span className="min-w-0">
                <span className="block">My profile</span>
                <span className="block truncate text-xs text-black/40">{admin.email}</span>
              </span>
            </Link>
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
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
