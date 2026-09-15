// When an order can go to the printer.
//
// Stickers are printed after the customer generates their QR codes — the QR is
// part of the artwork — so a paid order waits until every sticker on it has
// one. This is the rule the fulfilment action and the order page both use.

export type PrintLine = {
  quantity: number;
  /** QR codes one unit of this product grants. */
  qrSlots: number;
  /** Tags generated against this order line, replacements included. */
  tagsGenerated: number;
};

export type Readiness = { needed: number; generated: number; ready: boolean };

function whole(n: number): number {
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
}

/**
 * How many QR codes the order needs and how many exist.
 *
 * Each line is capped at its own slots: a replacement QR an admin issued on
 * one line is not a code the customer generated for another, and must not
 * make an unfinished order look ready.
 */
export function printReadiness(lines: readonly PrintLine[]): Readiness {
  let needed = 0;
  let generated = 0;
  for (const line of lines) {
    const slots = whole(line.quantity) * whole(line.qrSlots);
    needed += slots;
    generated += Math.min(slots, whole(line.tagsGenerated));
  }
  return { needed, generated, ready: generated >= needed };
}
