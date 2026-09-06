// Who may read a MediaAsset's bytes, and how long anything may cache them.
//
// Kept pure and separate from the route handler so the whole matrix is
// unit-testable. The route's job is to look up the two facts this needs
// (the asset's kind/owner, and whether a profile currently publishes it)
// and then do exactly what this returns.

export type MediaKind = "PROFILE_PHOTO" | "PRODUCT_IMAGE" | "THEME_ART";

export type MediaAssetRef = {
  kind: MediaKind;
  ownerId: string | null;
};

export type Viewer = { id: string; role: "USER" | "ADMIN" } | null;

export type MediaAccess =
  | { allowed: false }
  | { allowed: true; cacheControl: string; varyOnCookie: boolean };

const DENIED: MediaAccess = { allowed: false };

// Product images are catalogue content: identical for everyone, safe to keep
// forever in any cache between us and the browser.
const PUBLIC_IMMUTABLE = "public, max-age=31536000, immutable";

// A published profile photo can be un-published at any moment, and the owner
// expects that to take effect. `private` keeps it out of every shared cache
// (CDN, corporate proxy) so revocation is not defeated by someone else's copy;
// the short max-age caps how long one browser may lag behind.
const PRIVATE_SHORT = "private, max-age=300, must-revalidate";

// Owner-only bytes: nothing may retain them.
const PRIVATE_NONE = "private, no-store";

export function resolveMediaAccess(
  asset: MediaAssetRef,
  { publiclyVisible, viewer }: { publiclyVisible: boolean; viewer: Viewer },
): MediaAccess {
  // Catalogue content: identical for every visitor, and meant to be seen.
  if (asset.kind === "PRODUCT_IMAGE" || asset.kind === "THEME_ART") {
    return { allowed: true, cacheControl: PUBLIC_IMMUTABLE, varyOnCookie: false };
  }

  // PROFILE_PHOTO — published only while a profile actually points at it with
  // photoPublic set. An orphaned photo (uploaded, then replaced) is private.
  if (publiclyVisible) {
    return { allowed: true, cacheControl: PRIVATE_SHORT, varyOnCookie: true };
  }

  if (viewer?.role === "ADMIN") {
    return { allowed: true, cacheControl: PRIVATE_NONE, varyOnCookie: true };
  }
  if (viewer && asset.ownerId && viewer.id === asset.ownerId) {
    return { allowed: true, cacheControl: PRIVATE_NONE, varyOnCookie: true };
  }

  return DENIED;
}
