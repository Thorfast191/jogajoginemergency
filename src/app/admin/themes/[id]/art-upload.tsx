"use client";

import { useActionState } from "react";
import { uploadThemeArtAction, type ThemeState } from "../actions";

const initial: ThemeState = {};

export function ThemeArtUpload({
  themeId,
  artAssetId,
  previewVersion,
}: {
  themeId: string;
  artAssetId: string | null;
  /** Changes whenever the theme is saved, so the rendered preview is refetched. */
  previewVersion: number;
}) {
  const [state, formAction, pending] = useActionState(
    uploadThemeArtAction.bind(null, themeId),
    initial,
  );

  return (
    <div className="max-w-sm">
      <p className="text-xs font-medium text-black/60">Finished sticker, with a sample QR</p>
      <div className="mt-2 overflow-hidden rounded-xl border border-black/10 bg-black/[0.03]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/themes/${themeId}/preview?v=${previewVersion}`}
          alt="Sticker preview with a sample QR in the centre square"
          className="block h-auto w-full"
        />
      </div>
      {!artAssetId && (
        <p className="mt-2 text-xs text-black/50">
          No artwork uploaded yet — stickers use a generated design in this theme&apos;s colours.
        </p>
      )}

      <form action={formAction} className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor="art" className="sr-only">
          Sticker artwork
        </label>
        <input
          id="art"
          name="art"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="min-w-0 flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Uploading…" : artAssetId ? "Replace" : "Upload"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.success && (
        <p className="mt-2 text-sm text-[var(--color-primary-dark)]">Artwork updated.</p>
      )}
      <p className="mt-2 text-xs text-black/40">
        JPEG, PNG or WebP, up to 10 MB. Kept at print quality (up to 3000px). Leave an empty square
        in the centre of the design.
      </p>
    </div>
  );
}
