import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { UserStatusToggle } from "../status-toggle";
import { CustomerIdentityForm } from "./identity-form";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) redirect("/dashboard");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      emergencyProfile: { include: { _count: { select: { contacts: true } } } },
      tags: { include: { product: true }, orderBy: { createdAt: "desc" } },
      orders: { orderBy: { createdAt: "desc" }, include: { _count: { select: { items: true } } } },
      subscriptions: { where: { status: "ACTIVE" }, include: { plan: true } },
    },
  });
  if (!user) notFound();

  return (
    <div>
      <Link href="/admin/users" className="text-sm text-black/50 hover:underline">
        ← Users
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{user.name}</h1>
      <p className="text-sm text-black/50">
        {user.email} · {user.role} · {user.status}
      </p>
      {user.role === "USER" && (
        <div className="mt-2">
          <UserStatusToggle userId={user.id} status={user.status} />
        </div>
      )}

      {user.role === "USER" ? (
        <section className="mt-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-black/40">
            Account details
          </h2>
          <div className="mt-3">
            <CustomerIdentityForm userId={user.id} name={user.name} email={user.email} />
          </div>
        </section>
      ) : (
        <p className="mt-4 text-sm text-black/50">
          This is an admin account. Its own details are changed at /admin/profile, and its admin
          access at /admin/admins.
        </p>
      )}

      <div className="mt-6 grid sm:grid-cols-3 gap-4 text-sm">
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-black/50">Emergency profile</p>
          <p className="mt-1 font-semibold">
            {user.emergencyProfile
              ? `${user.emergencyProfile.visibilityPreset} · ${user.emergencyProfile._count.contacts} contact(s)`
              : "Not created"}
          </p>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-black/50">Tags</p>
          <p className="mt-1 font-semibold">{user.tags.length}</p>
        </div>
        <div className="rounded-lg border border-black/10 p-4">
          <p className="text-black/50">Subscription</p>
          <p className="mt-1 font-semibold">{user.subscriptions[0]?.plan.name ?? "None"}</p>
        </div>
      </div>

      <h2 className="mt-8 font-semibold">Tags</h2>
      <ul className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10 text-sm">
        {user.tags.map((t) => (
          <li key={t.id} className="px-3 py-2 flex justify-between">
            <Link href={`/admin/tags/${t.id}`} className="font-mono text-emerald-700 hover:underline">
              /t/{t.shortCode}
            </Link>
            <span className="text-black/50">
              {t.product?.name ?? "—"} · {t.status}
            </span>
          </li>
        ))}
        {user.tags.length === 0 && <li className="px-3 py-2 text-black/50">No tags.</li>}
      </ul>

      <h2 className="mt-8 font-semibold">Orders</h2>
      <ul className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10 text-sm">
        {user.orders.map((o) => (
          <li key={o.id} className="px-3 py-2 flex justify-between">
            <Link href={`/admin/orders/${o.id}`} className="font-mono text-emerald-700 hover:underline">
              {o.orderNumber}
            </Link>
            <span className="text-black/50">
              {formatPrice(o.totalCents, o.currency)} · {o.status}
            </span>
          </li>
        ))}
        {user.orders.length === 0 && <li className="px-3 py-2 text-black/50">No orders.</li>}
      </ul>
    </div>
  );
}
