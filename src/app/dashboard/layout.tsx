import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/items", label: "Items" },
  { href: "/dashboard/tags", label: "Tags" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="min-h-screen flex flex-col sm:flex-row">
      <aside className="sm:w-56 border-b sm:border-b-0 sm:border-r border-black/10 p-4 flex sm:flex-col gap-1">
        <Link href="/" className="font-semibold mb-4 hidden sm:block">
          Jogajog <span className="text-emerald-600">Emergency</span>
        </Link>
        <nav className="flex sm:flex-col gap-1 flex-wrap">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm hover:bg-black/5"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="sm:mt-auto flex flex-col gap-2">
          {session?.user?.role === "ADMIN" && (
            <Link href="/admin" className="text-sm px-3 py-2 rounded-md hover:bg-black/5">
              Admin panel →
            </Link>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="text-sm px-3 py-2 rounded-md hover:bg-black/5 text-left w-full"
            >
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 max-w-4xl">{children}</main>
    </div>
  );
}
