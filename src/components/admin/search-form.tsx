/**
 * A plain GET search box for console lists. No client JavaScript: submitting
 * reloads the page with `?q=`, and the other filters ride along as hidden
 * fields so a search never resets them. Paging restarts from the first page.
 */
export function SearchForm({
  action,
  placeholder,
  defaultValue,
  keep = {},
}: {
  action: string;
  placeholder: string;
  defaultValue?: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} method="get" role="search" className="flex max-w-md gap-2">
      {Object.entries(keep).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <label className="sr-only" htmlFor="console-search">
        Search
      </label>
      <input
        id="console-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
      >
        Search
      </button>
    </form>
  );
}
