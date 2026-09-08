// QR slot accounting.
//
// Buying a sticker does not hand over a pre-made code — it buys the right to
// generate one. A slot is the unit of that right: every paid order line grants
// `quantity × product.qrSlots` of them, and every tag the customer creates
// spends one. This is what stops an account minting unlimited QR codes without
// ever buying a sticker.

export type PaidLine = { quantity: number; qrSlots: number };

export type SlotBalance = {
  owned: number;
  used: number;
  available: number;
};

export function slotsOwned(lines: PaidLine[]): number {
  return lines.reduce((n, l) => {
    const qty = Number.isFinite(l.quantity) ? Math.max(0, Math.trunc(l.quantity)) : 0;
    const per = Number.isFinite(l.qrSlots) ? Math.max(0, Math.trunc(l.qrSlots)) : 0;
    return n + qty * per;
  }, 0);
}

export function slotBalance(lines: PaidLine[], tagsCreated: number): SlotBalance {
  const owned = slotsOwned(lines);
  const used = Math.max(0, tagsCreated);
  return { owned, used, available: Math.max(0, owned - used) };
}

export function canGenerateTag(balance: SlotBalance): boolean {
  return balance.available > 0;
}

// --- Per-line attribution -------------------------------------------------
// The totals above answer "may this account generate a tag at all". They do
// not say which purchase the new tag belongs to, and that matters: a tag
// inherits its line's product and theme, and the line is its provenance.
// Picking the most recent paid line regardless of whether its slots are
// already spent gets both wrong once a customer has bought twice.

export type LineCapacity = {
  orderItemId: string;
  productId: string | null;
  themeId: string | null;
  quantity: number;
  qrSlots: number;
  /** Tags already generated against this line. */
  tagsUsed: number;
};

function whole(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}

/** Slots still unspent on one order line. */
export function lineRemaining(line: LineCapacity): number {
  return Math.max(0, whole(line.quantity) * whole(line.qrSlots) - whole(line.tagsUsed));
}

/**
 * The line a newly generated tag should be charged to.
 *
 * Callers pass lines oldest purchase first, so the oldest unspent slot is
 * used up before a newer one — a customer who bought a plain sticker last year
 * and a themed one today gets the plain one's slot first, and the themed
 * sticker's slot stays available for the tag they actually want themed.
 */
export function nextOpenLine(lines: readonly LineCapacity[]): LineCapacity | null {
  for (const line of lines) {
    if (lineRemaining(line) > 0) return line;
  }
  return null;
}
