import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ItemForm } from "./item-form";
import { ItemRow } from "./item-row";

export default async function ItemsPage() {
  const user = await getCustomer();
  if (!user) redirect("/login");

  const items = await prisma.item.findMany({
    where: { userId: user.id },
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
          <ItemRow key={item.id} item={item} tagCount={item.tags.length} />
        ))}
        {items.length === 0 && <p className="text-sm text-black/50">No items yet.</p>}
      </ul>
    </div>
  );
}
