import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffWith } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { Forbidden } from "@/components/admin/forbidden";
import { ProductForm } from "../product-form";
import { ProductImageControls } from "./image-controls";
import { ArchiveButton } from "./archive-button";

export const dynamic = "force-dynamic";

export default async function AdminProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getStaffWith("catalog.edit");
  if (!admin) return <Forbidden />;
  const { id } = await params;

  const [product, themes] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.theme.findMany({
      where: { status: "ACTIVE" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <Link href="/admin/products" className="text-sm text-black/50 hover:underline">
        ← Products
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{product.name}</h1>

      <div className="mt-6 grid md:grid-cols-[200px_1fr] gap-8">
        <div>
          <ProductImageControls productId={product.id} imageAssetId={product.imageAssetId} />
        </div>
        <div className="space-y-8">
          <ProductForm
            themes={themes}
            canPrice={can(admin.role, "pricing.manage")}
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              tagline: product.tagline,
              description: product.description,
              useCase: product.useCase,
              priceCents: product.priceCents,
              currency: product.currency,
              qrSlots: product.qrSlots,
              stickerWidthMm: product.stickerWidthMm,
              status: product.status,
              sortOrder: product.sortOrder,
              themeId: product.themeId,
            }}
          />
          {product.status !== "ARCHIVED" && can(admin.role, "destructive") && (
            <ArchiveButton productId={product.id} />
          )}
        </div>
      </div>
    </div>
  );
}
