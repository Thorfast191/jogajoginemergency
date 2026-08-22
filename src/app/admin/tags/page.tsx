import { prisma } from "@/lib/prisma";
import { TagStatusSelect } from "./tag-status-select";

export default async function AdminTagsPage() {
  const tags = await prisma.tag.findMany({
    include: { user: { select: { name: true, email: true } }, item: true, _count: { select: { scanEvents: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Tags</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-2 pr-4">Short code</th>
              <th className="py-2 pr-4">Owner</th>
              <th className="py-2 pr-4">Item</th>
              <th className="py-2 pr-4">Scans</th>
              <th className="py-2 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((t) => (
              <tr key={t.id} className="border-b border-black/5">
                <td className="py-2 pr-4 font-mono">{t.shortCode}</td>
                <td className="py-2 pr-4">
                  {t.user.name}
                  <div className="text-xs text-black/40">{t.user.email}</div>
                </td>
                <td className="py-2 pr-4">{t.item?.label ?? "—"}</td>
                <td className="py-2 pr-4">{t._count.scanEvents}</td>
                <td className="py-2 pr-4">
                  <TagStatusSelect tagId={t.id} status={t.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
