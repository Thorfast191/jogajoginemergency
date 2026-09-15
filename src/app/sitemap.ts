import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { appUrl } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

/**
 * The storefront and the content pages. Nothing behind a login, never a scan
 * page, and not the demo (which is marked noindex).
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
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    ...products.map((p) => ({
      url: `${base}/shop/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
