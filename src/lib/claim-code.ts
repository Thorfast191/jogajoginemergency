import { customAlphabet } from "nanoid";

// Uppercase-only, no 0/1/I/O/U — this code is typed off a printed sticker into
// the /claim form. Deliberately disjoint from the shortCode alphabet (which is
// mixed-case and appears in the QR URL).
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTVWXYZ";
const nano = customAlphabet(ALPHABET, 12);

/** e.g. `K7QF-3M9P-XR2T` */
export function generateClaimCode(): string {
  const s = nano();
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

/** Strip separators/whitespace, upper-case, regroup into `XXXX-XXXX-XXXX`. */
export function normalizeClaimCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  return (cleaned.match(/.{1,4}/g) ?? []).join("-");
}
