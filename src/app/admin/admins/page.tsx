import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PromoteAdminForm, DemoteAdminButton } from "./admin-controls";

export const dynamic = "force-dynamic";

export default async function AdminAdminsPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/dashboard");

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, status: true, createdAt: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Admins</h1>
      <p className="mt-1 text-sm text-black/50">
        Admins can edit the store, see every customer and resolve abuse reports. The last admin
        cannot be removed, and nobody can remove their own access.
      </p>

      <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
        {admins.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-4 p-3 text-sm">
            <div className="min-w-0">
              <Link href={`/admin/users/${a.id}`} className="font-medium hover:underline">
                {a.name}
              </Link>
              <p className="truncate text-xs text-black/50">{a.email}</p>
            </div>
            <DemoteAdminButton userId={a.id} isSelf={a.id === admin.id} />
          </li>
        ))}
      </ul>

      <section className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-wide text-black/40">
          Add an admin
        </h2>
        <div className="mt-3">
          <PromoteAdminForm />
        </div>
      </section>
    </div>
  );
}
