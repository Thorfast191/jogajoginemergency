import Link from "next/link";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/permissions";
import { Forbidden } from "@/components/admin/forbidden";
import { PromoteAdminForm, RoleControl } from "./admin-controls";

export const dynamic = "force-dynamic";

const WHAT_EACH_CAN_DO = [
  {
    role: "Admin",
    tone: "bg-sky-100 text-sky-700",
    items: [
      "Customers, orders and fulfilment, print files",
      "Generated QR codes: search, stickers, mark lost or active",
      "Product and theme content, artwork and the QR square",
      "Subscriptions (view), plan names and features",
      "Scan activity and abuse reports",
    ],
  },
  {
    role: "Super admin",
    tone: "bg-violet-100 text-violet-700",
    items: [
      "Everything an admin can do",
      "Payments, revenue, refunds, and granting or extending plans",
      "Prices, QR slots, publishing products and plans",
      "Deactivating QR codes, suspending users, archiving",
      "Admins, platform settings and the activity log",
    ],
  },
];

export default async function AdminAdminsPage() {
  const admin = await getStaffWith("admins.manage");
  if (!admin) return <Forbidden />;

  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Admins</h1>
      <p className="mt-1 text-sm text-black/50">
        There must always be at least one super admin, and nobody can change their own role. A
        role change signs that person out so they come back with the right access.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {WHAT_EACH_CAN_DO.map((r) => (
          <div key={r.role} className="rounded-2xl border border-black/10 bg-white p-4">
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${r.tone}`}>{r.role}</span>
            <ul className="mt-3 space-y-1 text-sm text-black/70">
              {r.items.map((i) => (
                <li key={i}>· {i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <ul className="mt-8 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
        {staff.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm">
            <div className="min-w-0">
              <Link href={`/admin/users/${a.id}`} className="font-medium hover:underline">
                {a.name}
              </Link>{" "}
              <span className="text-xs text-black/40">{roleLabel(a.role)}</span>
              <p className="truncate text-xs text-black/50">{a.email}</p>
            </div>
            <RoleControl userId={a.id} role={a.role} isSelf={a.id === admin.id} />
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-wide text-black/40">Add an admin</h2>
        <div className="mt-3">
          <PromoteAdminForm />
        </div>
      </section>
    </div>
  );
}
