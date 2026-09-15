// Where the QR goes on a sticker.
//
// Every theme's artwork leaves an empty square in its centre, and the
// customer's QR is composited into it. The square is always centred; a theme
// only chooses how big it is, as a percentage of the artwork's shorter edge —
// so the same setting gives a square that fits whether the design is wide,
// tall or square.
//
// Pure, because a box one pixel out of place is a QR printed over someone's
// artwork, and that should be caught by a test rather than a print run.

export const QR_BOX_MIN = 20;
export const QR_BOX_MAX = 80;
export const QR_BOX_DEFAULT = 40;

export type Box = { left: number; top: number; size: number };

/** A usable square size: a whole percent between the limits. */
export function clampBoxSize(pct: number): number {
  if (!Number.isFinite(pct)) return QR_BOX_DEFAULT;
  return Math.min(QR_BOX_MAX, Math.max(QR_BOX_MIN, Math.round(pct)));
}

/** The centred square, in whole pixels, for artwork of this size. */
export function qrBox(width: number, height: number, sizePct: number): Box {
  const size = Math.round((Math.min(width, height) * clampBoxSize(sizePct)) / 100);
  return {
    left: Math.floor((width - size) / 2),
    top: Math.floor((height - size) / 2),
    size,
  };
}

/** Millimetres to PDF points (1/72 inch). */
export function mmToPt(mm: number): number {
  return (mm * 72) / 25.4;
}
