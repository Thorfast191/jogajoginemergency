import Link from "next/link";
import { themeCssVars, type ThemeSkin } from "@/lib/themes";
import { ThemeMascot } from "@/components/illustrations";
import { unlockedBy, type UnlockingProduct } from "@/lib/theme-access";
import { setTagThemeAction } from "./actions";

type Option = ThemeSkin & { id: string };

/**
 * Skin picker for one tag.
 *
 * A theme comes with the sticker product that carries it, so a theme the
 * customer has not bought is shown locked rather than hidden — seeing what a
 * Helmet sticker would look like is the reason to buy one. The server refuses
 * unowned themes regardless of what this renders.
 */
export function ThemePicker({
  tagId,
  themes,
  currentThemeId,
  entitledThemeIds,
  products,
}: {
  tagId: string;
  themes: Option[];
  currentThemeId: string | null;
  entitledThemeIds: string[];
  products: UnlockingProduct[];
}) {
  const owned = new Set(entitledThemeIds);

  return (
    <div>
      <h2 className="font-semibold">Scan page theme</h2>
      <p className="mt-1 text-xs text-black/50">
        Changes what a finder sees. Your emergency details stay exactly the same.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {themes.map((theme) => {
          const current = theme.id === currentThemeId;
          const unlocked = owned.has(theme.id);
          const seller = unlocked ? null : unlockedBy(theme.id, products);

          return (
            <div
              key={theme.id}
              style={themeCssVars(theme) as React.CSSProperties}
              className={`overflow-hidden rounded-xl border-2 ${
                current ? "border-[var(--color-primary)]" : "border-black/10"
              }`}
            >
              <div className="relative grid h-20 place-items-center bg-[var(--skin-bg)]">
                <ThemeMascot
                  mascot={theme.mascot}
                  className={`h-12 w-12 text-[var(--skin-accent)] ${unlocked ? "" : "opacity-40"}`}
                />
                {!unlocked && (
                  <span
                    aria-hidden
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white"
                  >
                    Locked
                  </span>
                )}
              </div>
              <div className="bg-white p-2">
                <span className="block truncate text-xs font-semibold">{theme.name}</span>

                {current ? (
                  <p className="mt-1 text-center text-xs font-semibold text-[var(--color-primary)]">
                    Current
                  </p>
                ) : unlocked ? (
                  <form action={setTagThemeAction}>
                    <input type="hidden" name="tagId" value={tagId} />
                    <input type="hidden" name="themeId" value={theme.id} />
                    <button
                      type="submit"
                      className="mt-1 w-full rounded-lg bg-black/5 py-1 text-xs font-medium hover:bg-black/10"
                    >
                      Use
                    </button>
                  </form>
                ) : seller ? (
                  <Link
                    href={`/shop/${seller.slug}`}
                    className="mt-1 block truncate rounded-lg bg-black/5 py-1 text-center text-xs font-medium text-black/60 hover:bg-black/10"
                    title={`Comes with the ${seller.name}`}
                  >
                    Comes with {seller.name}
                  </Link>
                ) : (
                  <p className="mt-1 text-center text-xs text-black/40">Not for sale</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
