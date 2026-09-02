import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { signOutAction } from "@/app/auth-actions";

export const dynamic = "force-dynamic";

const sections: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "",
    links: [{ href: "/admin", label: "Overview" }],
  },
  {
    heading: "Store",
    links: [
      { href: "/admin/products", label: "Products" },
      { href: "/admin/orders", label: "Orders" },
    ],
  },
  {
    heading: "Tag management",
    links: [
      { href: "/admin/tags", label: "Tag Inventory" },
      { href: "/admin/tags/issued", label: "Issued Tags" },
    ],
  },
  {
    heading: "Customers",
    links: [
      { href: "/admin/users", label: "Users" },
      { href: "/admin/subscriptions", label: "Subscriptions" },
      { href: "/admin/payments", label: "Payments" },
    ],
  },
  {
    heading: "Monitoring",
    links: [
      { href: "/admin/scans", label: "Scan Activity" },
      { href: "/admin/abuse-reports", label: "Abuse Reports" },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col sm:flex-row bg-black/[0.015]">
      <aside className="sm:w-60 shrink-0 border-b sm:border-b-0 sm:border-r border-black/10 bg-white p-4 flex flex-col gap-4">
        <div>
          <p className="font-semibold">
            Jogajog <span className="text-emerald-600">Control</span>
          </p>
          <p className="text-[11px] uppercase tracking-wide text-black/40">Platform admin</p>
        </div>

        <nav className="flex flex-col gap-4">
          {sections.map((section, i) => (
            <div key={section.heading || i} className="flex flex-col gap-0.5">
              {section.heading && (
                <p className="px-3 text-[11px] font-medium uppercase tracking-wide text-black/40">
                  {section.heading}
                </p>
              )}
              {section.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="rounded-md px-3 py-2 text-sm hover:bg-black/5"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="mt-auto border-t border-black/10 pt-3">
          <p className="px-3 text-xs text-black/50">{admin.email}</p>
          <form action={signOutAction}>
            <button
              type="submit"
              className="mt-1 w-full text-left text-sm px-3 py-2 rounded-md hover:bg-black/5"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 max-w-6xl">{children}</main>
    </div>
  );
}
