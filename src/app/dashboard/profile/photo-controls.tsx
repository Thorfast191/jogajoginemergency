"use client";

import { useActionState, useRef } from "react";
import { useTransition } from "react";
import {
  uploadProfilePhotoAction,
  deleteProfilePhotoAction,
  type PhotoState,
} from "./actions";

const initial: PhotoState = {};

export function PhotoControls({ photoAssetId }: { photoAssetId: string | null }) {
  const [state, formAction, pending] = useActionState(uploadProfilePhotoAction, initial);
  const [removing, startRemove] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-start gap-4">
      <div className="shrink-0">
        {photoAssetId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/media/${photoAssetId}`}
            alt="Your profile photo"
            className="w-24 h-24 rounded-full object-cover border border-black/10"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-black/[0.04] border border-dashed border-black/20 flex items-center justify-center text-xs text-black/40">
            No photo
          </div>
        )}
      </div>

      <div className="space-y-2">
        <form action={formAction} className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            required
            className="text-sm"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {pending ? "Uploading…" : photoAssetId ? "Replace" : "Upload"}
          </button>
        </form>

        {photoAssetId && (
          <button
            onClick={() =>
              startRemove(async () => {
                await deleteProfilePhotoAction();
              })
            }
            disabled={removing}
            className="text-xs text-red-600 hover:underline disabled:opacity-60"
          >
            {removing ? "Removing…" : "Remove photo"}
          </button>
        )}

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="text-sm text-emerald-600">Photo updated.</p>}
        <p className="text-xs text-black/40">
          JPEG, PNG or WebP up to 5 MB. Shown publicly only if you enable it in Privacy.
        </p>
      </div>
    </div>
  );
}
