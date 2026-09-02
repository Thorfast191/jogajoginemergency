import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TagStatusSelect } from "../tag-status-select";

export const dynamic = "force-dynamic";

export default async function AdminIssuedTagsPage() {
  if (!(await getAdmin())) redirect("/dashboard");

  const tags = await prisma.tag.findMany({
    where: { userId: { not: null } },
    include: {
      user: { select: { name: true, email: true } },
      item: { select: { label: true } },
      _count: { select: { scanEvents: true, relayMessages: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold">Issued Tags</h1>
          <p className="mt-1 text-sm text-black/60">
            Tags currently assigned to a customer account.
          </p>
        </div>
        <Link href="/admin/tags" className="text-sm text-emerald-700 hover:underline">
          ← Tag inventory
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">Short code</th>
              <th className="py-3 px-4">Owner</th>
              <th className="py-3 px-4">Item</th>
              <th className="py-3 px-4">Scans</th>
              <th className="py-3 px-4">Messages</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id} className="border-b border-black/5 last:border-b-0 align-top">
                <td className="py-3 px-4 font-mono">{tag.shortCode}</td>
                <td className="py-3 px-4">
                  <div>{tag.user?.name ?? "—"}</div>
                  <div className="text-xs text-black/40">{tag.user?.email}</div>
                </td>
                <td className="py-3 px-4">{tag.item?.label ?? "—"}</td>
                <td className="py-3 px-4">{tag._count.scanEvents}</td>
                <td className="py-3 px-4">{tag._count.relayMessages}</td>
                <td className="py-3 px-4">
                  <TagStatusSelect tagId={tag.id} status={tag.status} />
                </td>
              </tr>
            ))}
            {tags.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 px-4 text-center text-sm text-black/50">
                  No tags issued yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
