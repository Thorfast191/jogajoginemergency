// The optional subscription/premium tier is dormant. Its models and admin
// pages stay, but the customer-facing UI is hidden unless this is set.
export function isPremiumEnabled(): boolean {
  return process.env.PREMIUM_ENABLED === "1";
}
