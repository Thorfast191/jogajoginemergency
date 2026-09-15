"use client";

import { useState } from "react";
import { QR_BOX_MAX, QR_BOX_MIN } from "@/lib/sticker-layout";

/**
 * The QR square size, set with a slider over a live picture of where the
 * square will land.
 *
 * The overlay is positioned with the same rule the renderer uses — centred,
 * sized from the artwork's shorter edge — so what an admin sees here is where
 * the QR is printed. The saved preview under the editor is the real render.
 */
export function QrBoxField({
  defaultValue,
  artSrc,
  colours,
}: {
  defaultValue: number;
  /** Uploaded artwork, if any. Without it a neutral stand-in is shown. */
  artSrc: string | null;
  colours: { bg: string; accent: string };
}) {
  const [size, setSize] = useState(defaultValue);
  const [ratio, setRatio] = useState<{ w: number; h: number }>({ w: 1, h: 1 });

  const shorter = Math.min(ratio.w, ratio.h);
  const widthPct = (shorter * size) / ratio.w;
  const heightPct = (shorter * size) / ratio.h;

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="qrBoxSize" className="text-xs font-medium">
          QR square size
        </label>
        <span className="font-mono text-xs text-black/60">{size}%</span>
      </div>
      <input
        id="qrBoxSize"
        name="qrBoxSize"
        type="range"
        min={QR_BOX_MIN}
        max={QR_BOX_MAX}
        step={1}
        value={size}
        onChange={(e) => setSize(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--color-primary)]"
      />

      <div className="mt-3 flex justify-center">
        <div className="relative inline-block max-w-full overflow-hidden rounded-lg border border-black/10">
          {artSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artSrc}
              alt="Sticker artwork"
              className="block max-h-72 w-auto max-w-full"
              onLoad={(e) =>
                setRatio({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
              }
            />
          ) : (
            <div className="h-60 w-60" style={{ background: colours.bg }} />
          )}
          <div
            aria-hidden
            className="absolute grid place-items-center rounded-sm border-2 border-dashed bg-white/85 text-[10px] font-bold uppercase tracking-wider"
            style={{
              width: `${widthPct}%`,
              height: `${heightPct}%`,
              left: `${(100 - widthPct) / 2}%`,
              top: `${(100 - heightPct) / 2}%`,
              borderColor: colours.accent,
              color: colours.accent,
            }}
          >
            QR
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-black/50">
        Leave an empty square in the centre of your design. The customer&apos;s QR is printed into
        the dashed area, black on white.
      </p>
    </div>
  );
}
