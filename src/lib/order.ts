import { customAlphabet } from "nanoid";

// Human-friendly order reference. Uppercase unambiguous alphabet (shares the
// shortCode set minus lowercase); collisions are handled by the unique index +
// a retry at the call site.
const nano = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export function generateOrderNumber(): string {
  return `JJ-${nano()}`;
}
