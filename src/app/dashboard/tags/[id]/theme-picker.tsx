import { themeCssVars, type ThemeSkin } from "@/lib/themes";
import { ThemeMascot } from "@/components/illustrations";
import { setTagThemeAction } from "./actions";

type Option = ThemeSkin & { id: string };

/**
 * Skin picker for one tag. Themes are cosmetic — the subscription already pays
 * for the page itself — so every theme is selectable.
 */
export function ThemePicker({
  tagId,
  themes,
  currentThemeId,
}: {
  tagId: string;
  themes: Option[];
  currentThemeId: string | null;
}) {
  return (
    <div>
      <h2 className="font-semibold">Scan page theme</h2>
      <p className="mt-1 text-xs text-black/50">
        Changes what a finder sees. Your emergency details stay exactly the same.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {themes.map((theme) => {
          const current = theme.id === currentThemeId;
          return (
            <div
              key={theme.id}
              style={themeCssVars(theme) as React.CSSProperties}
              className={`overflow-hidden rounded-xl border-2 ${
                current ? "border-[var(--color-primary)]" : "border-black/10"
              }`}
            >
              <div className="grid h-20 place-items-center bg-[var(--skin-bg)]">
                <ThemeMascot mascot={theme.mascot} className="h-12 w-12 text-[var(--skin-accent)]" />
              </div>
              <div className="bg-white p-2">
                <span className="block truncate text-xs font-semibold">{theme.name}</span>
                {current ? (
                  <p className="mt-1 text-center text-xs font-semibold text-[var(--color-primary)]">
                    Current
                  </p>
                ) : (
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
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
