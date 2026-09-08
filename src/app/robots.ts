import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/payments/config";

/**
 * Scan pages, the client area and the admin console are all disallowed.
 *
 * `/t/` matters most: those pages are public because a finder must reach them
 * without an account, but they can carry a blood group and next of kin, and
 * an indexed emergency profile is a privacy failure. The route also sets
 * `noindex` itself and next.config.ts sends X-Robots-Tag, because a crawler
 * that ignores this file should still be told three other ways.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/t/", "/dashboard/", "/admin/", "/api/", "/checkout/", "/cart", "/media/"],
    },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
