import { describe, it, expect } from "vitest";
import { resolveMediaAccess, type MediaAssetRef, type Viewer } from "../media-access";

const owner: Viewer = { id: "user_owner", role: "USER" };
const stranger: Viewer = { id: "user_stranger", role: "USER" };
const admin: Viewer = { id: "user_admin", role: "ADMIN" };

const productImage: MediaAssetRef = { kind: "PRODUCT_IMAGE", ownerId: null };
const profilePhoto: MediaAssetRef = { kind: "PROFILE_PHOTO", ownerId: "user_owner" };

describe("resolveMediaAccess — product images", () => {
  it("serves product images to anyone, including signed-out visitors", () => {
    const access = resolveMediaAccess(productImage, { publiclyVisible: false, viewer: null });
    expect(access.allowed).toBe(true);
  });

  it("lets shared caches hold product images forever", () => {
    const access = resolveMediaAccess(productImage, { publiclyVisible: false, viewer: null });
    expect(access.allowed && access.cacheControl).toBe("public, max-age=31536000, immutable");
    expect(access.allowed && access.varyOnCookie).toBe(false);
  });
});

describe("resolveMediaAccess — published profile photos", () => {
  const published = { publiclyVisible: true, viewer: null };

  it("serves a photo whose owner set photoPublic", () => {
    expect(resolveMediaAccess(profilePhoto, published).allowed).toBe(true);
  });

  it("never lets a shared cache hold a profile photo", () => {
    const access = resolveMediaAccess(profilePhoto, published);
    // `private` is what stops a CDN keeping the photo after it is un-published.
    expect(access.allowed && access.cacheControl).toContain("private");
    expect(access.allowed && access.cacheControl).not.toContain("public");
    expect(access.allowed && access.cacheControl).not.toContain("immutable");
  });

  it("caps revocation lag at five minutes", () => {
    const access = resolveMediaAccess(profilePhoto, published);
    expect(access.allowed && access.cacheControl).toContain("max-age=300");
    expect(access.allowed && access.cacheControl).toContain("must-revalidate");
  });

  it("varies on cookie, because the answer depends on who is asking", () => {
    expect(resolveMediaAccess(profilePhoto, published).allowed && true).toBe(true);
    const access = resolveMediaAccess(profilePhoto, published);
    expect(access.allowed && access.varyOnCookie).toBe(true);
  });
});

describe("resolveMediaAccess — private profile photos", () => {
  const hidden = { publiclyVisible: false };

  it("denies an anonymous visitor", () => {
    expect(resolveMediaAccess(profilePhoto, { ...hidden, viewer: null }).allowed).toBe(false);
  });

  it("denies a signed-in stranger", () => {
    expect(resolveMediaAccess(profilePhoto, { ...hidden, viewer: stranger }).allowed).toBe(false);
  });

  it("allows the owner", () => {
    expect(resolveMediaAccess(profilePhoto, { ...hidden, viewer: owner }).allowed).toBe(true);
  });

  it("allows an admin", () => {
    expect(resolveMediaAccess(profilePhoto, { ...hidden, viewer: admin }).allowed).toBe(true);
  });

  it("tells caches to store nothing at all", () => {
    const access = resolveMediaAccess(profilePhoto, { ...hidden, viewer: owner });
    expect(access.allowed && access.cacheControl).toBe("private, no-store");
  });

  it("denies everyone but an admin when the asset is orphaned (no owner)", () => {
    const orphan: MediaAssetRef = { kind: "PROFILE_PHOTO", ownerId: null };
    expect(resolveMediaAccess(orphan, { ...hidden, viewer: null }).allowed).toBe(false);
    expect(resolveMediaAccess(orphan, { ...hidden, viewer: stranger }).allowed).toBe(false);
    expect(resolveMediaAccess(orphan, { ...hidden, viewer: admin }).allowed).toBe(true);
  });
});

describe("resolveMediaAccess — the revocation bug this fixes", () => {
  it("stops serving a photo the moment photoPublic is turned off", () => {
    const before = resolveMediaAccess(profilePhoto, { publiclyVisible: true, viewer: null });
    const after = resolveMediaAccess(profilePhoto, { publiclyVisible: false, viewer: null });
    expect(before.allowed).toBe(true);
    expect(after.allowed).toBe(false);
  });
});
