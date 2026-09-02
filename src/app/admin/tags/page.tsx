import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TagStatusSelect } from "./tag-status-select";
import { GenerateTagsButton } from "./generate-tags-button";
import { AssignTagForm } from "./assign-tag-form";

export const dynamic = "force-dynamic";

export default async function AdminTagInventoryPage() {
  if (!(await getAdmin())) redirect("/dashboard");

  const [tags, byStatus, customers] = await Promise.all([
    prisma.tag.findMany({
      include: {
        user: { select: { name: true, email: true } },
        item: { select: { label: true } },
        _count: { select: { scanEvents: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.tag.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.user.findMany({
      where: { role: "USER", status: "ACTIVE" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const count = (s: string) => byStatus.find((g) => g.status === s)?._count._all ?? 0;
  const total = byStatus.reduce((n, g) => n + g._count._all, 0);
  const stats = [
    { label: "Total tags", value: total },
    { label: "Unassigned", value: count("UNASSIGNED") },
    { label: "Active", value: count("ACTIVE") },
    { label: "Lost", value: count("LOST") },
    { label: "Deactivated", value: count("DEACTIVATED") },
  ];

  const unassignedTags = tags
    .filter((t) => t.status === "UNASSIGNED" && !t.userId)
    .map((t) => ({ id: t.id, shortCode: t.shortCode }));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tag Inventory</h1>
          <p className="mt-1 text-sm text-black/60">
            Generate and manage the platform&apos;s QR tag inventory.
          </p>
        </div>
        <Link href="/admin/tags/issued" className="text-sm text-emerald-700 hover:underline">
          Issued tags →
        </Link>
      </div>

      <div className="mt-6 space-y-4">
        <GenerateTagsButton />
        <AssignTagForm customers={customers} unassignedTags={unassignedTags} />
      </div>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-black/10 p-4">
            <p className="text-xs text-black/50">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">Short code</th>
              <th className="py-3 px-4">Owner</th>
              <th className="py-3 px-4">Item</th>
              <th className="py-3 px-4">Scans</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id} className="border-b border-black/5 last:border-b-0 align-top">
                <td className="py-3 px-4 font-mono">{tag.shortCode}</td>
                <td className="py-3 px-4">
                  {tag.user ? (
                    <>
                      <div>{tag.user.name}</div>
                      <div className="text-xs text-black/40">{tag.user.email}</div>
                    </>
                  ) : (
                    <span className="text-black/40">Unassigned</span>
                  )}
                </td>
                <td className="py-3 px-4">{tag.item?.label ?? "—"}</td>
                <td className="py-3 px-4">{tag._count.scanEvents}</td>
                <td className="py-3 px-4">
                  <TagStatusSelect tagId={tag.id} status={tag.status} />
                </td>
              </tr>
            ))}
            {tags.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 px-4 text-center text-sm text-black/50">
                  No tags in inventory yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
