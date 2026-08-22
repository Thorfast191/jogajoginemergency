import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "./item-form";
import { DeleteItemButton } from "./delete-button";

export default async function ItemsPage() {
  const session = await auth();
  const items = await prisma.item.findMany({
    where: { userId: session!.user.id },
    include: { tags: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Items</h1>
      <p className="mt-1 text-sm text-black/60">
        Register the belongings you want to protect, then assign a tag to each from the Tags page.
      </p>

      <div className="mt-6">
        <ItemForm />
      </div>

      <ul className="mt-6 space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-black/10 p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium">{item.label}</p>
              <p className="text-xs text-black/50">
                {item.category} · {item.tags.length} tag{item.tags.length === 1 ? "" : "s"} attached
              </p>
            </div>
            <DeleteItemButton itemId={item.id} />
          </li>
        ))}
        {items.length === 0 && <p className="text-sm text-black/50">No items yet.</p>}
      </ul>
    </div>
  );
}
