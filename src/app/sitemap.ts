import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

/**
 * Only the storefront. Nothing behind a login, and never a scan page.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();

  const products = await prisma.product
    .findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      orderBy: { sortOrder: "asc" },
    })
    .catch(() => []);

  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/themes`, changeFrequency: "monthly", priority: 0.5 },
    ...products.map((p) => ({
      url: `${base}/shop/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
