// The single source of truth for what a subscription unlocks. Nothing else in
// the codebase interprets a SubscriptionStatus.
//
// The tier is deliberately additive: emergency and medical information is free
// forever, and only extras sit behind it. A lapsed card must never hide a blood
// group from a first responder — see buildPublicProfileView, which enforces
// that invariant at the one place a public view is constructed.

export type SubStatus = "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING";

export type Entitlements = {
  /** Bio and links on the scan page. */
  portfolio: boolean;
  /** May select a PREMIUM theme as a tag's skin. */
  premiumThemes: boolean;
  /** Scan history beyond the most recent few. */
  fullScanHistory: boolean;
};

/** How much scan history a free account can see. */
export const FREE_SCAN_HISTORY = 5;

const NONE: Entitlements = { portfolio: false, premiumThemes: false, fullScanHistory: false };
const ALL: Entitlements = { portfolio: true, premiumThemes: true, fullScanHistory: true };

// PAST_DUE does not entitle: a failed payment should stop the paid extras
// while the customer sorts it out. It costs them nothing safety-critical.
const ENTITLING: ReadonlySet<SubStatus> = new Set<SubStatus>(["ACTIVE", "TRIALING"]);

export function isEntitled(status: SubStatus | null | undefined): boolean {
  return !!status && ENTITLING.has(status);
}

export function entitlementsFor(status: SubStatus | null | undefined): Entitlements {
  return isEntitled(status) ? { ...ALL } : { ...NONE };
}
