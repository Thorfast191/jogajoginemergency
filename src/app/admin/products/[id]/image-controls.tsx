"use client";

import { useActionState, useState } from "react";
import { useKeptForm } from "@/lib/use-kept-form";
import { MAX_IMAGE_BYTES, blockOversizeSubmit } from "@/lib/upload-limits";
import { uploadProductImageAction, type ProductState } from "../actions";

const initial: ProductState = {};

export function ProductImageControls({
  productId,
  imageAssetId,
}: {
  productId: string;
  imageAssetId: string | null;
}) {
  const action = uploadProductImageAction.bind(null, productId);
  const [state, formAction, pending] = useActionState<ProductState, FormData>(action, initial);
  const [tooBig, setTooBig] = useState<string | null>(null);
  const [formRef, submitForm] = useKeptForm(formAction, state, true);

  return (
    <div className="space-y-2">
      {imageAssetId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/media/${imageAssetId}`}
          alt=""
          className="w-full aspect-square object-cover rounded-lg border border-black/10"
        />
      ) : (
        <div className="w-full aspect-square rounded-lg border border-dashed border-black/20 flex items-center justify-center text-xs text-black/40">
          No image
        </div>
      )}
      <form
        ref={formRef}
        action={formAction}
        onSubmit={(e) => {
          setTooBig(blockOversizeSubmit(e, MAX_IMAGE_BYTES));
          submitForm(e);
        }}
        className="space-y-2"
      >
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          required
          className="text-xs"
        />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? "Uploading…" : imageAssetId ? "Replace image" : "Upload image"}
        </button>
      </form>
      {(tooBig ?? state.error) && <p className="text-sm text-red-600">{tooBig ?? state.error}</p>}
      {!tooBig && state.success && <p className="text-sm text-emerald-600">Image updated.</p>}
    </div>
  );
}
