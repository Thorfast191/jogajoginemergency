import Link from "next/link";
import { signOutAction } from "@/app/dashboard/actions";

export const dynamic = "force-dynamic";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/abuse-reports", label: "Abuse reports" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col sm:flex-row">
      <aside className="sm:w-56 border-b sm:border-b-0 sm:border-r border-black/10 p-4 flex sm:flex-col gap-1">
        <Link href="/" className="font-semibold mb-4 hidden sm:block">
          Jogajog <span className="text-emerald-600">Admin</span>
        </Link>
        <nav className="flex sm:flex-col gap-1 flex-wrap">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-2 text-sm hover:bg-black/5">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="sm:mt-auto flex flex-col gap-2">
          <Link href="/dashboard" className="text-sm px-3 py-2 rounded-md hover:bg-black/5">
            ← Back to dashboard
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="text-sm px-3 py-2 rounded-md hover:bg-black/5 text-left w-full">
              Log out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6 max-w-5xl">{children}</main>
    </div>
  );
}
