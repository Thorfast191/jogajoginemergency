// Page numbers arrive from the query string, so anything that isn't a positive
// whole page falls back to the first one rather than becoming a negative skip.

export const PER_PAGE = 50;

export function pageParams(
  raw: string | undefined,
  perPage: number = PER_PAGE,
): { page: number; skip: number; take: number } {
  const n = Math.trunc(Number(raw));
  const page = Number.isFinite(n) && n >= 1 ? n : 1;
  return { page, skip: (page - 1) * perPage, take: perPage };
}

export function pageCount(total: number, perPage: number = PER_PAGE): number {
  return Math.max(1, Math.ceil(total / perPage));
}
