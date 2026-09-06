"use client";

import { useActionState } from "react";
import { uploadThemeArtAction, type ThemeState } from "../actions";

const initial: ThemeState = {};

export function ThemeArtUpload({ themeId, artAssetId }: { themeId: string; artAssetId: string | null }) {
  const [state, formAction, pending] = useActionState(
    uploadThemeArtAction.bind(null, themeId),
    initial,
  );

  return (
    <div className="max-w-sm">
      <div className="grid aspect-square w-full place-items-center overflow-hidden rounded-xl border border-black/10 bg-black/[0.03]">
        {artAssetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${artAssetId}`} alt="" className="h-full w-full object-cover" />
        ) : (
          <p className="px-6 text-center text-sm text-black/40">
            No sticker artwork yet — the store falls back to the product image.
          </p>
        )}
      </div>

      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
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
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-emerald-700">Artwork updated.</p>}
      <p className="mt-2 text-xs text-black/40">JPEG, PNG or WebP, up to 5 MB. Resized to 1024px.</p>
    </div>
  );
}
