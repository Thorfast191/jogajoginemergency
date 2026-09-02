// Money is stored as integer minor units (cents / poisha). Render with the
// currency code prefix and grouped thousands.
export function formatPrice(cents: number, currency: string): string {
  const value = cents / 100;
  return `${currency} ${value.toLocaleString("en-US")}`;
}
