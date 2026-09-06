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
