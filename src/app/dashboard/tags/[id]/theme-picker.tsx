import { themeCssVars, type ThemeSkin } from "@/lib/themes";
import { ThemeMascot } from "@/components/illustrations";
import { Badge } from "@/components/ui";
import { setTagThemeAction } from "./actions";
import Link from "next/link";

type Option = ThemeSkin & { id: string };

/**
 * Skin picker for one tag. Locked (premium) themes are still shown — seeing
 * what Plus unlocks is the point — but their button is replaced by an upgrade
 * link. The server action re-checks entitlement regardless.
 */
export function ThemePicker({
  tagId,
  themes,
  currentThemeId,
  entitled,
}: {
  tagId: string;
  themes: Option[];
  currentThemeId: string | null;
  entitled: boolean;
}) {
  return (
    <div>
      <h2 className="font-semibold">Scan page theme</h2>
      <p className="mt-1 text-xs text-black/50">
        Changes what a finder sees. Your emergency details stay exactly the same.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {themes.map((theme) => {
          const locked = theme.tier === "PREMIUM" && !entitled;
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
                <ThemeMascot
                  mascot={theme.mascot}
                  className={`h-12 w-12 text-[var(--skin-accent)] ${locked ? "opacity-40" : ""}`}
                />
              </div>
              <div className="bg-white p-2">
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs font-semibold">{theme.name}</span>
                  {theme.tier === "PREMIUM" && <Badge tone="grape">Plus</Badge>}
                </div>
                {current ? (
                  <p className="mt-1 text-center text-xs font-semibold text-[var(--color-primary)]">
                    Current
                  </p>
                ) : locked ? (
                  <Link
                    href="/dashboard/subscription"
                    className="mt-1 block text-center text-xs font-medium text-violet-700 hover:underline"
                  >
                    Unlock
                  </Link>
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
