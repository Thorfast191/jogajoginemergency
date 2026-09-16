"use client";

import { useActionState } from "react";
import { useKeptForm } from "@/lib/use-kept-form";
import { createThemeAction, updateThemeAction, type ThemeState } from "./actions";
import { MASCOTS } from "@/lib/themes";
import { QR_BOX_DEFAULT } from "@/lib/sticker-layout";
import { QrBoxField } from "./qr-box-field";

const initial: ThemeState = {};

type Theme = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  bgColor: string;
  surfaceColor: string;
  inkColor: string;
  accentColor: string;
  mascot: string;
  qrBoxSize: number;
  artAssetId: string | null;
  status: string;
  sortOrder: number;
};

const input = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm";

function Colour({ name, label, value }: { name: string; label: string; value?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium">{label}</span>
      <span className="flex items-center gap-2">
        <input type="color" name={name} defaultValue={value ?? "#000000"} className="h-9 w-10 rounded border border-black/15" />
        <input readOnly value={value ?? ""} className={`${input} font-mono`} tabIndex={-1} />
      </span>
    </label>
  );
}

export function ThemeForm({ theme }: { theme?: Theme }) {
  const [state, formAction, pending] = useActionState(
    theme ? updateThemeAction.bind(null, theme.id) : createThemeAction,
    initial,
  );
  const [formRef, submitForm] = useKeptForm(formAction, state);

  return (
    <form ref={formRef} action={formAction} onSubmit={submitForm} className="max-w-2xl space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Slug</span>
          <input name="slug" required defaultValue={theme?.slug} className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Name</span>
          <input name="name" required defaultValue={theme?.name} className={input} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium">Tagline</span>
        <input name="tagline" required defaultValue={theme?.tagline} className={input} />
        <span className="mt-1 block text-xs text-black/40">
          Shown under the wordmark on the scan page, and printed on generated artwork.
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-4">
        <Colour name="bgColor" label="Background" value={theme?.bgColor ?? "#FBF9F6"} />
        <Colour name="surfaceColor" label="Surface" value={theme?.surfaceColor ?? "#FFFFFF"} />
        <Colour name="inkColor" label="Ink" value={theme?.inkColor ?? "#171717"} />
        <Colour name="accentColor" label="Accent" value={theme?.accentColor ?? "#059669"} />
      </div>

      <QrBoxField
        defaultValue={theme?.qrBoxSize ?? QR_BOX_DEFAULT}
        artSrc={theme?.artAssetId ? `/media/${theme.artAssetId}` : null}
        colours={{ bg: theme?.bgColor ?? "#FBF9F6", accent: theme?.accentColor ?? "#059669" }}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Mascot</span>
          <select name="mascot" defaultValue={theme?.mascot ?? "BLOB"} className={input}>
            {MASCOTS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Status</span>
          <select name="status" defaultValue={theme?.status ?? "ACTIVE"} className={input}>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium">Sort order</span>
          <input
            name="sortOrder"
            type="number"
            min={0}
            defaultValue={theme?.sortOrder ?? 0}
            className={input}
          />
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-[var(--color-primary-dark)]">Saved.</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : theme ? "Save theme" : "Create theme"}
      </button>
    </form>
  );
}
