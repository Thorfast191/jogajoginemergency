import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/money";
import { ProductForm } from "./product-form";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  if (!(await getAdmin())) redirect("/dashboard");

  const products = await prisma.product.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { tags: true } } },
  });

  const themes = await prisma.theme.findMany({
    where: { status: "ACTIVE" },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Products</h1>
      <p className="mt-1 text-sm text-black/60">Physical products sold in the shop.</p>

      <div className="mt-6 overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-black/50 border-b border-black/10">
              <th className="py-3 px-4">Image</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Sort</th>
              <th className="py-3 px-4">Tags</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-b-0">
                <td className="py-2 px-4">
                  {p.imageAssetId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/media/${p.imageAssetId}`} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-black/[0.05]" />
                  )}
                </td>
                <td className="py-2 px-4">
                  <Link href={`/admin/products/${p.id}`} className="text-emerald-700 hover:underline">
                    {p.name}
                  </Link>
                  <div className="text-xs text-black/40 font-mono">{p.slug}</div>
                </td>
                <td className="py-2 px-4">{formatPrice(p.priceCents, p.currency)}</td>
                <td className="py-2 px-4">{p.status}</td>
                <td className="py-2 px-4">{p.sortOrder}</td>
                <td className="py-2 px-4">{p._count.tags}</td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 px-4 text-center text-black/50">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="font-semibold mb-3">New product</h2>
        <ProductForm themes={themes} />
      </div>
    </div>
  );
}
