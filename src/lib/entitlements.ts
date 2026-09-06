// The single source of truth for what a subscription unlocks. Nothing else in
// the codebase interprets a SubscriptionStatus.
//
// The model: a sticker is a one-time purchase that grants QR slots, and the
// subscription is what makes the page those QRs open actually show anything.
// Without an active subscription a scan reaches a dormant page — the owner's
// information is withheld, but the anonymous relay stays open so a found item
// can still be returned and the owner still hears about it.

export type SubStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";

// PAST_DUE does not entitle: a failed payment should close the page until the
// customer sorts it out.
const ENTITLING: ReadonlySet<SubStatus> = new Set<SubStatus>(["ACTIVE", "TRIALING"]);

export function isEntitled(status: SubStatus | null | undefined): boolean {
  return !!status && ENTITLING.has(status);
}

/**
 * What a scan shows when the owner has no active subscription.
 *
 * Kept as one named constant because it is the product's sharpest edge: change
 * it and you change what a stranger sees standing over someone's lost helmet.
 * `RELAY_ONLY` withholds every field but keeps the message box; `DORMANT`
 * withholds the relay too and leaves the finder no way to reach anyone.
 */
export const LAPSED_BEHAVIOUR: "RELAY_ONLY" | "DORMANT" = "RELAY_ONLY";
