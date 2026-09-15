import Link from "next/link";
import { pageCount, PER_PAGE } from "@/lib/pagination";

/**
 * Previous / next links for a console list. Every other query parameter (search,
 * filters) is carried through, so paging never drops what the admin searched for.
 */
export function Pagination({
  basePath,
  params,
  page,
  total,
  perPage = PER_PAGE,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  total: number;
  perPage?: number;
}) {
  const pages = pageCount(total, perPage);
  if (pages <= 1) return null;

  const href = (p: number) => {
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) query.set(k, v);
    if (p > 1) query.set("page", String(p));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const link = "rounded-lg border border-black/15 bg-white px-3 py-1.5 hover:bg-black/5";
  const off = "rounded-lg border border-black/10 px-3 py-1.5 text-black/30";

  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-black/50">
        Page {page} of {pages} · {total} total
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className={link}>
            ← Previous
          </Link>
        ) : (
          <span className={off}>← Previous</span>
        )}
        {page < pages ? (
          <Link href={href(page + 1)} className={link}>
            Next →
          </Link>
        ) : (
          <span className={off}>Next →</span>
        )}
      </div>
    </nav>
  );
}
