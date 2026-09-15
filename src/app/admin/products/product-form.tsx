"use client";

import { useActionState } from "react";
import { createProductAction, updateProductAction, type ProductState } from "./actions";

const initial: ProductState = {};

type Product = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  useCase: string | null;
  priceCents: number;
  currency: string;
  qrSlots: number;
  stickerWidthMm: number;
  status: string;
  sortOrder: number;
  themeId: string | null;
};

type ThemeOption = { id: string; name: string };

export function ProductForm({
  product,
  themes = [],
  canPrice = true,
}: {
  product?: Product;
  themes?: ThemeOption[];
  /**
   * Whether price, currency, QR slots and status are editable. The server
   * ignores those fields from anyone without `pricing.manage` regardless.
   */
  canPrice?: boolean;
}) {
  const action = product ? updateProductAction.bind(null, product.id) : createProductAction;
  const [state, formAction, pending] = useActionState<ProductState, FormData>(action, initial);

  const field = "mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

  return (
    <form action={formAction} className="space-y-3 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Slug
          <input name="slug" defaultValue={product?.slug ?? ""} required className={field} />
        </label>
        <label className="text-sm">
          Name
          <input name="name" defaultValue={product?.name ?? ""} required className={field} />
        </label>
      </div>
      <label className="text-sm block">
        Tagline
        <input name="tagline" defaultValue={product?.tagline ?? ""} required className={field} />
      </label>
      <label className="text-sm block">
        Description
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          required
          rows={4}
          className={field}
        />
      </label>
      <label className="text-sm block">
        Use case
        <input name="useCase" defaultValue={product?.useCase ?? ""} className={field} />
      </label>

      {canPrice ? (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="text-sm">
              Price (paisa)
              <input
                name="priceCents"
                type="number"
                min={0}
                defaultValue={product?.priceCents ?? 0}
                required
                className={field}
              />
            </label>
            <label className="text-sm">
              Currency
              <input name="currency" defaultValue={product?.currency ?? "BDT"} className={field} />
            </label>
            <label className="text-sm">
              QR slots
              <input
                name="qrSlots"
                type="number"
                min={1}
                max={100}
                defaultValue={product?.qrSlots ?? 1}
                required
                className={field}
              />
            </label>
          </div>
          <p className="-mt-1 text-xs text-black/40">
            Price is in the currency&apos;s smallest unit (29900 = ৳299). QR slots is how many QR codes
            one purchase lets the customer generate.
          </p>
        </>
      ) : (
        product && (
          <p className="rounded-lg bg-black/[0.03] px-3 py-2 text-xs text-black/60">
            Price, QR slots and status are set by a super admin.
          </p>
        )
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Sticker width (mm)
          <input
            name="stickerWidthMm"
            type="number"
            min={20}
            max={300}
            defaultValue={product?.stickerWidthMm ?? 60}
            required
            className={field}
          />
        </label>
        <label className="text-sm">
          Sort order
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={product?.sortOrder ?? 0}
            className={field}
          />
        </label>
      </div>

      <label className="text-sm block">
        Theme
        <select name="themeId" defaultValue={product?.themeId ?? ""} className={field}>
          <option value="">No theme</option>
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-black/40">
          Sets the printed artwork (with the customer&apos;s QR in its centre) and the starting
          scan-page skin. Buying this product is what unlocks the theme for the customer.
        </span>
      </label>

      {canPrice && (
        <label className="text-sm block">
          Status
          <select name="status" defaultValue={product?.status ?? "DRAFT"} className={field}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
      )}

      {!product && (
        <label className="text-sm block">
          Product image
          <input
            type="file"
            name="image"
            accept="image/jpeg,image/png,image/webp"
            className="mt-1 block w-full text-xs"
          />
          <span className="mt-1 block text-xs text-black/40">
            Optional. Without one, the shop shows the theme&apos;s sticker with a sample QR.
          </span>
        </label>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-[var(--color-primary-dark)]">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--color-primary)] text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
      >
        {pending ? "Saving…" : product ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}
