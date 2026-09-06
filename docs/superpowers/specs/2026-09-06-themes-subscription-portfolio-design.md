# Themes, Subscription & Portfolio — Design Spec

Date: 2026-09-06
Status: Approved for implementation
Supersedes decision **D5** of `2026-09-02-jogajog-emergency-redesign-design.md`

---

## 1. What changes

The 2026-09-02 redesign deliberately decoupled subscription from every core
flow (D5) and shipped the product as "tag = one-time, everything free". The
business model is the other way round: the tag is a one-time purchase, and the
*profile* carries a subscription. This spec inverts D5 — carefully, because the
naive inversion is dangerous.

### 1.1 The lapse rule (locked)

**Emergency information is free forever. The subscription unlocks extras.**

| Layer | Free | Subscribed |
|---|---|---|
| Name, photo, emergency message | ✅ | ✅ |
| Blood group, allergies, medical notes | ✅ | ✅ |
| Emergency contacts, relay messaging | ✅ | ✅ |
| Portfolio (bio + links) | 🔒 | ✅ |
| Premium themes | 🔒 (free themes only) | ✅ |
| Scan history beyond the last 5 | 🔒 | ✅ |

A lapsed subscription must never hide medical data from a first responder.
This is a product-safety invariant, not a pricing preference: it is enforced in
`buildPublicProfileView`, and a test asserts that every medical field survives
`entitled: false`.

### 1.2 Themes span two surfaces

One `Theme` powers both the printed sticker artwork (a `Product` points at a
theme) and the scan page's skin (a `Tag` points at a theme). Buying a themed
sticker sets that tag's skin; a subscriber may re-skin any tag afterwards.

Themes are **character-agnostic by construction** — a theme is a name, a
palette, a mascot key and an artwork asset. No third-party character is
referenced in code or seed data. Licensed characters, if ever licensed, are
added as rows.

---

## 2. Data model

### 2.1 New

```prisma
enum ThemeTier { FREE PREMIUM }

model Theme {
  id, slug @unique, name, tagline
  tier         ThemeTier     @default(FREE)
  bgColor, surfaceColor, inkColor, accentColor  // scan-page skin tokens
  mascot       String        @default("BLOB")   // key into the SVG cast
  artAssetId   String?                          // sticker artwork
  status       ProductStatus @default(ACTIVE)
  sortOrder    Int           @default(0)
}

model ProfileLink {
  id, profileId, label, url, sortOrder, isPublic
}
```

Skin tokens are explicit columns rather than a JSON blob so the admin form and
the renderer share one typed contract and a malformed theme cannot reach the
scan page.

### 2.2 Changed

- `Product.themeId String?` — which theme this sticker is printed in.
- `Tag.themeId String?` — this tag's scan-page skin. Copied from the product at
  allocation; a subscriber may change it.
- `EmergencyProfile.bio String?`, `.bioPublic Boolean @default(false)`,
  `.linksPublic Boolean @default(true)`.

`Subscription` and `SubscriptionPlan` stop being dormant. `PREMIUM_ENABLED` is
removed — the tier is now core, not an experiment.

---

## 3. Entitlements

`src/lib/entitlements.ts` is the single source of truth:

```ts
type Entitlements = { portfolio: boolean; premiumThemes: boolean; fullScanHistory: boolean };
entitlementsFor(status: SubscriptionStatus | null): Entitlements
```

`ACTIVE` and `TRIALING` entitle; `PAST_DUE`, `CANCELED` and no-subscription do
not. Nothing else in the codebase interprets subscription status.

**Graceful degradation.** A tag skinned with a `PREMIUM` theme whose owner has
lapsed must not break or leak. `resolveScanTheme(theme, entitled)` falls back to
the default free theme; the tag's stored `themeId` is left alone so re-subscribing
restores it. Portfolio links vanish from the DTO entirely — not as a value, not
as a key, matching how medical privacy already works.

---

## 4. Store: cart

`src/lib/cart.ts` becomes a real cart over an `httpOnly` `jj_cart` cookie
holding `[{ slug, qty }]`. Read in Server Components via `cookies()`; written
only from Server Functions, per the Next.js 16 cookie rules. Checkout iterates
the cart and allocates tags per line — `OrderItem` and `allocateTags` already
support multi-line orders, only the UI did not.

Cart lines are validated against live products at checkout: price is always
re-read from the database, never trusted from the cookie.

---

## 5. Scan page

`buildPublicProfileView` gains `entitled` and returns `bio` and `links`
alongside the existing fields. The page renders inside a theme shell driven by
CSS custom properties from `resolveScanTheme`. The emergency block keeps its
current calm, high-contrast treatment under every theme — a skin may change
the frame, never the legibility of medical data.

---

## 6. Design system

A palette and motion overhaul across all four surfaces: warmer, higher-contrast
tokens; a mascot cast (the existing blob plus themed variants); entrance,
hover and celebration motion, all behind `prefers-reduced-motion`. The scan
page stays deliberately restrained — it is read by strangers in an emergency.

---

## 7. Non-goals (unchanged)

Real payment gateway (stays `DEMO`, webhook-shaped), email/SMS delivery,
shipping carriers, multi-profile per account.
