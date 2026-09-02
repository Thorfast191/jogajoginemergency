# Jogajog Emergency — Product Redesign Design Spec

Date: 2026-09-02
Status: Approved for planning
Author: pairing session (see Claude-Session link in commit trailer)

---

## 1. Context & goals

Jogajog Emergency is being repositioned as **two connected businesses**:

1. **Physical QR tag/sticker store** — customers browse physical products (bike
   sticker, car sticker, luggage sticker, helmet sticker, …) and buy them with a
   **one-time payment**. No subscription is required to own a tag.
2. **SaaS emergency-profile platform** — the account, the emergency profile, the
   privacy controls, the public QR page, and the dashboard. An optional premium
   subscription may layer on later but gates nothing today.

The current implementation treats a tag as a subscription entitlement that an
admin hand-assigns. Signup forces plan selection. The dashboard revolves around
an `Item` (belongings) model. There is no storefront, no order system, no user
profile entity, and no privacy model — the public scan page leaks the owner's
real name and any attached item photo. This spec redesigns those areas while
preserving the parts that are well built: the `src/lib/session.ts` authorization
core, per-row ownership scoping in server actions, the hashed-IP scan logging,
the rate limiter, and the admin/customer separation.

### Non-goals

- Real payment gateway integration (SSLCommerz/bKash). Payments stay in `DEMO`
  mode, structured so a webhook can write to the same `Payment` model later.
- Full shipping/fulfilment (carriers, labels, tracking numbers). Order carries
  minimal nullable shipping fields and a `fulfillmentStatus` enum only.
- Email/SMS delivery. `src/lib/notify.ts` stays a console stub.
- A launched premium tier. Subscription models are kept but dormant and
  flag-gated.
- Multi-tenant / multi-profile per account. One `EmergencyProfile` per user;
  schema leaves room to add more later.

---

## 2. Locked decisions

| # | Decision | Choice |
|---|---|---|
| D1 | Old `Item` model | Fold the useful string onto `Tag.internalLabel`, backfill, then **drop the `Item` table** and `Tag.itemId` in a separate, explicit destructive migration. |
| D2 | Emergency profile scope | **One `EmergencyProfile` per account.** Every tag the user owns resolves to it. |
| D3 | Media storage | **Postgres `bytea` via a `MediaAsset` table**, served through a cached `GET /media/[id]` route handler behind a small storage interface. No new infrastructure. |
| D4 | Tag acquisition | **Auto-allocate inventory tags at checkout** and link them to the account immediately, **plus** a `claimCode`-based `/claim` path for stickers bought offline / gifted / replaced. |
| D5 | Subscription/premium | **Keep the models, decouple them from core flows.** Remove plan selection from signup and plan-gating from the tag flow. `/dashboard/billing` → `/dashboard/subscription`, simplified, hidden behind a `PREMIUM_ENABLED` env flag (default off). Admin subscription/payment pages stay. |
| D6 | Post-purchase tag state | Tags go **straight to `ACTIVE`** on paid order — scannable immediately. If the buyer has not filled in a profile, the scan page shows a friendly "owner hasn't added info yet" state. |
| D7 | Testing | Add a **minimal Vitest setup** covering security-critical pure logic only (privacy DTO, code generators, tag allocation). |
| D8 | `/pricing` route | **301 redirect `/pricing` → `/shop`.** The subscription-style pricing page is removed from the public site. |

---

## 3. Current architecture (reference)

- **Stack:** Next.js 16.3 (App Router, `proxy.ts` not `middleware.ts`), React 19,
  Postgres + Prisma 6, Auth.js v5 (Credentials, JWT sessions), Tailwind v4,
  Docker/standalone. `tsc --noEmit` and `npm run lint` both pass. No tests.
- **Models:** `User`, `Item`, `Tag` (with public-profile fields on it),
  `ScanEvent`, `RelayMessage`, `AbuseReport`, `SubscriptionPlan` /
  `Subscription` / `Payment` (`Payment.subscriptionId` is a required FK).
- **Auth:** `proxy.ts` does optimistic cookie redirects; `src/lib/session.ts`
  does the real enforcement (`requireActiveUser` re-reads `User.status` from the
  DB on every call; `getAdmin` / `getCustomer` / `requireAdmin` /
  `requireCustomer`). Server actions scope writes with `where: { id, userId }`.
- **Tag flow:** admin generates `UNASSIGNED` inventory → `assignTagAction`
  requires an active subscription + `maxTags` → flips to `userId=customer,
  ACTIVE`. Customers cannot self-acquire.
- **Working tree:** contains a large, coherent uncommitted change (admin control
  panel, tag inventory, assignment, `make_tag_owner_optional` migration). This
  spec builds on the working tree.

---

## 4. Target data model

Prisma schema. All money is integer minor units (`*Cents`), default currency
`"BDT"`. All ids are `cuid()`.

### 4.1 Kept unchanged

`Account`, `Session`, `VerificationToken`, `ScanEvent`, `RelayMessage`,
`AbuseReport`, enums `Role`, `UserStatus`, `PaymentProvider`, `PaymentStatus`,
`AbuseReportStatus`.

`AbuseReport` keeps its shape; `abuseReportSchema` in `validations.ts` is
corrected so the field carrying a short code is named `shortCode`, not `tagId`
(**S4**, cosmetic — no behaviour change).

### 4.2 Kept but dormant

`SubscriptionPlan`, `Subscription`, `SubscriptionStatus` remain. `Subscription`
gains no new required coupling. `SubscriptionPlan.maxTags` stays as a column but
**no active code path reads it**. Admin `/admin/subscriptions` and
`/admin/payments` keep working.

### 4.3 `User` (changed)

- Remove relation `items Item[]`.
- Add relations: `emergencyProfile EmergencyProfile?`, `orders Order[]`,
  `mediaAssets MediaAsset[]`, `tagBatches TagBatch[]` (as creator).
- Keep `phone` — account contact only, never auto-published.
- `tags Tag[]` relation stays but the FK changes (see 4.7).

### 4.4 `Product` (new)

```prisma
model Product {
  id           String        @id @default(cuid())
  slug         String        @unique          // "bike-sticker"
  name         String                          // "Bike QR Sticker"
  tagline      String                          // one-line description
  description  String                          // longer copy
  useCase      String?                         // "Great for daily commuters…"
  priceCents   Int
  currency     String        @default("BDT")
  imageAssetId String?
  status       ProductStatus @default(DRAFT)
  sortOrder    Int           @default(0)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  imageAsset MediaAsset? @relation("ProductImage", fields: [imageAssetId], references: [id])
  tags       Tag[]
  orderItems OrderItem[]
  batches    TagBatch[]

  @@index([status, sortOrder])
}

enum ProductStatus { DRAFT ACTIVE ARCHIVED }
```

Only `ACTIVE` products appear in the storefront. `ARCHIVED` products stay
referenceable by historical tags/orders. Physical attributes (material, size)
are intentionally omitted for v1 and can be added as nullable columns later.

### 4.5 `TagBatch` (new)

```prisma
model TagBatch {
  id          String   @id @default(cuid())
  label       String                           // "Feb 2026 bike run"
  productId   String?
  quantity    Int
  createdById String
  createdAt   DateTime @default(now())

  product   Product? @relation(fields: [productId], references: [id])
  createdBy User     @relation(fields: [createdById], references: [id])
  tags      Tag[]

  @@index([productId])
}
```

Admin batch generation records how many tags were minted, for which product, by
whom. A batch with `productId = null` is generic stock an admin can assign a
product to later.

### 4.6 `Order` / `OrderItem` (new)

```prisma
model Order {
  id                String            @id @default(cuid())
  orderNumber       String            @unique   // "JJ-K7QF3M"
  userId            String
  status            OrderStatus       @default(PENDING)
  fulfillmentStatus FulfillmentStatus @default(UNFULFILLED)
  subtotalCents     Int
  totalCents        Int
  currency          String            @default("BDT")
  shipName          String?
  shipPhone         String?
  shipAddress       String?
  shipCity          String?
  shipNote          String?
  placedAt          DateTime?
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt

  user     User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  items    OrderItem[]
  payments Payment[]

  @@index([userId])
  @@index([status])
}

model OrderItem {
  id             String @id @default(cuid())
  orderId        String
  productId      String
  quantity       Int    @default(1)
  unitPriceCents Int                            // price snapshot at purchase
  currency       String @default("BDT")

  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id])
  tags    Tag[]                                 // inventory tags allocated to this line

  @@index([orderId])
}

enum OrderStatus       { PENDING PAID CANCELLED REFUNDED }
enum FulfillmentStatus { UNFULFILLED PROCESSING SHIPPED DELIVERED }
```

`fulfillmentStatus` is informational and admin-driven; it never gates the
digital tag. The schema supports multiple `OrderItem`s per order; the v1
checkout UI creates one product line at a time (see 8.2).

### 4.7 `Payment` (repurposed — polymorphic)

```prisma
model Payment {
  id             String          @id @default(cuid())
  kind           PaymentKind     @default(ORDER)
  orderId        String?
  subscriptionId String?
  amountCents    Int
  currency       String          @default("BDT")
  provider       PaymentProvider @default(DEMO)
  providerRef    String?
  status         PaymentStatus   @default(PENDING)
  createdAt      DateTime        @default(now())

  order        Order?        @relation(fields: [orderId], references: [id], onDelete: Cascade)
  subscription Subscription? @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([subscriptionId])
}

enum PaymentKind { ORDER SUBSCRIPTION }
```

Migration: `subscriptionId` becomes nullable. M1 adds `kind` as
`NOT NULL DEFAULT 'ORDER'` (Postgres backfills existing rows to `ORDER`); the
backfill script then corrects every existing row to `SUBSCRIPTION` (all current
payments belong to a subscription). The column default stays `ORDER` — the app
default for new order payments — and subscription code writes `kind` explicitly.
A CHECK-style invariant (exactly one of `orderId` / `subscriptionId` non-null,
matching `kind`) is enforced in application code, not the DB.

### 4.8 `Tag` (extended + slimmed)

```prisma
model Tag {
  id            String    @id @default(cuid())
  shortCode     String    @unique             // in the QR URL, 8 chars
  claimCode     String    @unique             // printed on sticker, for /claim
  productId     String?
  batchId       String?
  orderItemId   String?
  userId        String?                        // owner once claimed
  internalLabel String?                        // private nickname
  status        TagStatus @default(UNASSIGNED)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  product       Product?       @relation(fields: [productId], references: [id])
  batch         TagBatch?      @relation(fields: [batchId], references: [id])
  orderItem     OrderItem?     @relation(fields: [orderItemId], references: [id], onDelete: SetNull)
  user          User?          @relation(fields: [userId], references: [id], onDelete: SetNull)
  scanEvents    ScanEvent[]
  relayMessages RelayMessage[]
  abuseReports  AbuseReport[]

  @@index([userId])
  @@index([productId])
  @@index([orderItemId])
  @@index([status])
}

enum TagStatus { UNASSIGNED ALLOCATED ACTIVE LOST DEACTIVATED }
```

**Removed columns** (migration M3): `publicDisplayName`, `publicMessage`,
`maskedPhone`, `contactMode`, `itemId`. The `ContactMode` enum is redefined for
`EmergencyProfile` (see 4.9) — values `RELAY`, `DIRECT_CALL`.

**FK change:** `Tag.userId` goes from `onDelete: Cascade` to `onDelete: SetNull`
(**S3**). Deleting a user must not destroy the physical tag row or its scan
history. Account deletion (not implemented yet, but the release helper is) also
calls `releaseTagToInventory` for each owned tag.

**Status semantics:**

| Status | Meaning |
|---|---|
| `UNASSIGNED` | Raw inventory. `userId` null, `orderItemId` null. |
| `ALLOCATED` | Attached to an `OrderItem` on a `PENDING` order, not yet paid. `userId` null. |
| `ACTIVE` | Owned and live. Set on paid order (D6) or successful `/claim`. |
| `LOST` | Owner flagged it lost; scan page shows a prominent banner. |
| `DEACTIVATED` | Owner disabled it; scan page returns `notFound()`. |

### 4.9 `EmergencyProfile` (new — one per user)

```prisma
model EmergencyProfile {
  id               String            @id @default(cuid())
  userId           String            @unique
  displayName      String?                       // falls back to User.name at render if null
  photoAssetId     String?
  bloodGroup       String?
  allergies        String?
  medicalNotes     String?
  emergencyMessage String?
  contactMode      ContactMode       @default(RELAY)
  phonePublic      String?                       // distinct public/forwarding number
  visibilityPreset VisibilityPreset  @default(STANDARD)
  photoPublic        Boolean @default(true)
  namePublic         Boolean @default(true)
  messagePublic      Boolean @default(true)
  bloodGroupPublic   Boolean @default(false)
  allergiesPublic    Boolean @default(false)
  medicalNotesPublic Boolean @default(false)
  contactsPublic     Boolean @default(true)
  showPhone          Boolean @default(false)     // publish phonePublic on the scan page
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  user       User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  photoAsset MediaAsset?        @relation("ProfilePhoto", fields: [photoAssetId], references: [id])
  contacts   EmergencyContact[]
}

enum ContactMode      { RELAY DIRECT_CALL }
enum VisibilityPreset { MINIMAL STANDARD FULL CUSTOM }
```

Privacy is **boolean columns**, not a join table — the field set is fixed and
known, so columns are simpler, type-safe, and need no join to render.
`visibilityPreset` is a convenience: choosing a preset in the UI sets the
booleans; changing any boolean directly sets the preset to `CUSTOM`.

Preset → booleans mapping (`src/lib/privacy.ts`):

| Field | MINIMAL | STANDARD | FULL |
|---|---|---|---|
| `photoPublic` | false | true | true |
| `namePublic` | false | true | true |
| `messagePublic` | true | true | true |
| `contactsPublic` | false | true | true |
| `bloodGroupPublic` | false | false | true |
| `allergiesPublic` | false | false | true |
| `medicalNotesPublic` | false | false | true |
| `showPhone` | false | false | true |

`contactMode` is independent of the preset.

### 4.10 `EmergencyContact` (new)

```prisma
model EmergencyContact {
  id        String  @id @default(cuid())
  profileId String
  name      String
  relation  String?                              // "Brother", "Spouse"
  phone     String?
  email     String?
  isPublic  Boolean @default(true)
  sortOrder Int     @default(0)

  profile EmergencyProfile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
}
```

A contact appears on the scan page only if `contactsPublic` **and** the
contact's own `isPublic` are both true. Cap: 5 contacts per profile (enforced in
the action).

### 4.11 `MediaAsset` (new)

```prisma
model MediaAsset {
  id        String    @id @default(cuid())
  ownerId   String?                              // uploader; null = system/product
  kind      MediaKind
  mimeType  String
  byteSize  Int
  width     Int?
  height    Int?
  data      Bytes
  checksum  String                               // sha256 hex, used as ETag
  createdAt DateTime  @default(now())

  owner         User?             @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  profileUsages EmergencyProfile[] @relation("ProfilePhoto")
  productUsages Product[]          @relation("ProductImage")

  @@index([ownerId])
}

enum MediaKind { PROFILE_PHOTO PRODUCT_IMAGE }
```

- **Write:** via server actions only (`uploadProfilePhotoAction`,
  admin `uploadProductImageAction`). No public upload endpoint.
- **Read:** `GET /media/[id]` streams `data` with
  `Content-Type: <mimeType>`, `Cache-Control: public, max-age=31536000,
  immutable`, `ETag: "<checksum>"`, and honours `If-None-Match` with `304`.
- **Access model:** any holder of the (unguessable `cuid`) id can fetch the
  bytes. The **scan page decides whether to emit the `<img>` tag at all**, based
  on `photoPublic`. This is URL-capability security, deliberately chosen: it
  matches how the current `photoUrl` already behaves, keeps the route dumb and
  cacheable, and a profile photo is low-sensitivity. A note in the code records
  that per-request authorization can be layered on if requirements change.
- **Processing** (`src/lib/media.ts`, uses `sharp` — already in `node_modules`
  as a Next optional dep; promote to an explicit `dependencies` entry):
  accept `image/jpeg`, `image/png`, `image/webp`; reject > 5 MB upload; strip
  metadata; resize longest edge to ≤ 512 px (profile) / ≤ 1024 px (product);
  re-encode to WebP quality 80; compute `sha256`. Reject anything `sharp` can't
  decode.
- **Replacement:** setting a new profile photo deletes the previous
  `MediaAsset` row (best-effort, after the profile update commits).

---

## 5. Migration plan

Four ordered steps. Each is a real Prisma migration except the backfill, which
is a script run between M1 and M2. **No `migrate reset`.** After every step:
`npx prisma validate`, `npx prisma generate`, `npx tsc --noEmit`,
`npm run lint`.

### M1 — additive (`add_store_profile_privacy_media`)

- Create enums: `ProductStatus`, `OrderStatus`, `FulfillmentStatus`,
  `PaymentKind`, `VisibilityPreset`, `MediaKind`. Add `ALLOCATED` to
  `TagStatus`. Add `DIRECT_CALL` to the existing `ContactMode` via raw
  `ALTER TYPE "ContactMode" ADD VALUE 'DIRECT_CALL'` in the migration SQL — after
  M1 `ContactMode` is `{ RELAY, MASKED_PHONE, DIRECT_CALL }`. `EmergencyProfile`
  uses it but new code only ever writes `RELAY` / `DIRECT_CALL`. The stale
  `MASKED_PHONE` member is removed in M3.
- Create tables: `Product`, `TagBatch`, `Order`, `OrderItem`,
  `EmergencyProfile`, `EmergencyContact`, `MediaAsset`.
- `Tag`: add nullable `claimCode`, `productId`, `batchId`, `orderItemId`,
  `internalLabel`. Change `userId` FK to `ON DELETE SET NULL`.
- `Payment`: add `kind` `NOT NULL DEFAULT 'ORDER'`, add nullable `orderId`, make
  `subscriptionId` nullable.
- `User`: no column change (relations only).

Because `prisma migrate dev` generates the migration from the schema diff, the
`ALTER TYPE … ADD VALUE` and the FK `ON DELETE` change are hand-edited into the
generated migration SQL where Prisma's diff is insufficient, then
`prisma migrate diff --exit-code` is used to confirm the schema and migration
history agree.

### Backfill — `prisma/backfill-redesign.ts` (idempotent, run once)

1. Upsert a `Product` `slug = "legacy-tag"`, `status = ARCHIVED`,
   `name = "Legacy Tag"`, `priceCents = 0`. Set `Tag.productId` to it for every
   tag where `productId IS NULL`.
2. For every `Tag` with `itemId` set and `internalLabel IS NULL`: set
   `internalLabel = Item.label`.
3. For every `Tag` where `claimCode IS NULL`: set a freshly generated unique
   claim code.
4. For every `User` that owns ≥ 1 `Tag` and has no `EmergencyProfile`: create
   one. Seed from the user's most-recently-updated owned tag:
   `displayName = tag.publicDisplayName ?? user.name`,
   `emergencyMessage = tag.publicMessage`,
   `contactMode = tag.contactMode === "MASKED_PHONE" ? "DIRECT_CALL" : "RELAY"`,
   `phonePublic = tag.maskedPhone`,
   `showPhone = tag.contactMode === "MASKED_PHONE"`,
   `visibilityPreset = "STANDARD"` with the STANDARD booleans, except
   `showPhone` as computed.
5. `Payment`: set `kind = "SUBSCRIPTION"` for every existing row (all current
   payments belong to a subscription).
6. Print a summary (counts per step). Safe to re-run: every write is guarded by
   an `IS NULL` / "not exists" check.

### M2 — tighten (`require_tag_claim_code`)

- `Tag.claimCode`: `NOT NULL` + `@unique`.
- (If chosen) reset `Payment.kind` default to `ORDER`.

### M3 — destructive, explicit (`drop_item_and_tag_public_fields`)

- `Tag`: `DROP COLUMN publicDisplayName, publicMessage, maskedPhone,
  contactMode, itemId`.
- `DROP TABLE "Item"`.
- Remove the stale `MASKED_PHONE` enum member: create
  `ContactMode_new AS ENUM ('RELAY', 'DIRECT_CALL')`, `ALTER TABLE
  "EmergencyProfile" ALTER COLUMN "contactMode" TYPE "ContactMode_new" USING
  ("contactMode"::text::"ContactMode_new")`, `DROP TYPE "ContactMode"`,
  `ALTER TYPE "ContactMode_new" RENAME TO "ContactMode"`. Hand-edited into the
  generated migration SQL.

This migration is irreversible and destroys the `Item` table and the four `Tag`
columns. It runs **only after** the backfill has copied every value that the new
model needs. Data destroyed: `Item.category`, `Item.photoUrl` (external URLs —
not migrated; users re-upload a profile photo), and the `Item`↔`Tag` mapping
beyond the single `internalLabel` string.

### Seed changes — `prisma/seed.ts`

- Keep the admin upsert and (dormant) subscription plans.
- Upsert four `ACTIVE` products with `sortOrder` 1–4:
  `bike-sticker` "Bike QR Sticker", `car-sticker` "Car QR Sticker",
  `luggage-sticker` "Luggage QR Sticker", `helmet-sticker` "Helmet QR Sticker".
  Prices: 299 / 349 / 249 / 299 BDT (`*Cents`). Each gets a placeholder
  `PRODUCT_IMAGE` `MediaAsset` generated from a bundled SVG rendered to WebP via
  `sharp` (so `imageAssetId` is always populated in dev).

---

## 6. Routes

### 6.1 Public

| Route | Auth | Notes |
|---|---|---|
| `/` | — | Redesigned. Auth-aware "Get your tag" CTA. |
| `/shop` | — | Product grid; `ACTIVE` products ordered by `sortOrder`. |
| `/shop/[slug]` | — | Product detail. "Get yours" → `<GetYourTagButton product=slug>`: logged-in → `/checkout?product=slug`; else → `/signup?next=%2Fcheckout%3Fproduct%3Dslug`. |
| `/checkout` | customer | `?product=slug&qty=n` (qty 1–10). Shipping form (all optional). "Pay (demo)". |
| `/checkout/success` | customer | `?order=orderNumber`. Lists new tags + claim codes, CTA to `/dashboard/profile`. |
| `/claim` | customer | Form: enter claim code → redirect to `/claim/[code]`. |
| `/claim/[code]` | customer | Confirm + `claimTagAction`. Success → `/dashboard/tags/[id]`. |
| `/t/[shortCode]` | — | Redesigned public emergency page. `force-dynamic` kept. |
| `/media/[id]` | — | Image bytes, cached, ETag. |
| `/pricing` | — | **301 → `/shop`** (via `next.config.ts` `redirects()`). |
| `/login` `/signup` `/forgot-password` `/reset-password/[token]` | — | `signup` drops plan selection; `login` + `signup` honour `?next=` (validated: must start with `/`, no `//` or `/\`). |

### 6.2 Customer dashboard (`/dashboard/*`, customer only)

| Route | Notes |
|---|---|
| `/dashboard` | Overview: profile-completeness meter, tag count by status, recent scans, recent messages, recent orders. Empty states use illustrations. |
| `/dashboard/profile` | `EmergencyProfile` editor: photo upload/remove, display name, emergency message, blood group, allergies, medical notes, emergency contacts (add/edit/remove/reorder, max 5), contact mode. |
| `/dashboard/privacy` | Per-field visibility toggles + 3 preset buttons + a live inline preview of the public scan card. |
| `/dashboard/tags` | Owned tags: product type, status badge, internal label (inline edit), `/t/<code>` link, "preview public page", link to originating order. |
| `/dashboard/tags/[id]` | QR image + "Download PNG", internal label, status control (`ACTIVE` / `LOST` / `DEACTIVATED` only — never back to inventory states), scan history, messages for this tag. |
| `/dashboard/orders` | Order list: number, date, status, fulfilment, item count. |
| `/dashboard/orders/[id]` | Line items, payment status, per-tag claim codes, shipping info. |
| `/dashboard/messages` | Relay inbox (kept; "item" references replaced with tag label / internal label). |
| `/dashboard/settings` | Account name, phone, password (kept). |
| `/dashboard/subscription` | Replaces `/dashboard/billing`. Shown only if `PREMIUM_ENABLED`. Otherwise the nav item is hidden and the route redirects to `/dashboard`. |
| `/dashboard/items/*` | **Deleted.** |

### 6.3 Admin (`/admin/*`, admin only)

| Route | Notes |
|---|---|
| `/admin` | Overview + product / order / revenue tiles alongside existing customer / inventory / monitoring tiles. |
| `/admin/products` | List + create. Columns: image, name, price, status, sortOrder, tag count. |
| `/admin/products/[id]` | Edit all fields, upload/replace image, archive. |
| `/admin/orders` | List: number, customer, total, status, fulfilment, date. Filter by status. |
| `/admin/orders/[id]` | Line items, allocated tags, payment records, status + fulfilment transitions, customer link. |
| `/admin/tags` | Inventory. Batch generation (quantity 1–500 + product select + label) via `createMany`. Filter by product / status. Stat tiles per status. |
| `/admin/tags/issued` | Kept + product column. |
| `/admin/tags/[id]` | Tag detail: status, owner, order, batch, scans, messages, "return to inventory" (scrubs), "mark lost", "issue replacement" (allocates a fresh inventory tag of the same product to the same user/order). |
| `/admin/users` | Kept. "Tags" count label unchanged; "Items" count removed. |
| `/admin/users/[id]` | New detail page: profile summary, owned tags, orders, subscription, suspend/reactivate. |
| `/admin/scans` `/admin/abuse-reports` | Kept. |
| `/admin/subscriptions` | Kept (dormant data). |
| `/admin/payments` | Kept; query widened to show `kind = ORDER` payments too (customer + product/plan columns adapt to `kind`). |

### 6.4 `proxy.ts`

Matcher becomes `["/dashboard/:path*", "/admin/:path*", "/checkout/:path*",
"/claim/:path*"]`. Same optimistic logic: unauthenticated on any matched route →
`/login?next=<pathname>`; `USER` on `/admin/*` → `/dashboard`; `ADMIN` on
`/dashboard|/checkout|/claim` → `/admin`. Real enforcement stays in layouts +
actions.

---

## 7. Auth & authorization

- **`src/lib/session.ts`** — unchanged. All new server actions call
  `requireCustomer()` / `requireAdmin()` and scope every write with
  `where: { id, <ownerKey> }` (or a guarded `updateMany`), matching the existing
  pattern in `dashboard/tags/[id]/actions.ts` and `admin/actions.ts`.
- **`signupSchema`** — remove `planSlug`. **`signupAction`** — create the `User`
  only (no subscription, no payment). Read `?next=`; after `signIn`, redirect to
  the validated `next` or `/dashboard`.
- **`loginAction`** — read `?next=`; redirect admins to `/admin`, otherwise to
  `next` or `/dashboard`.
- **`<GetYourTagButton>`** (`src/components/get-your-tag-button.tsx`) — a server
  component: `const session = await auth()`. Renders a link to
  `/checkout?product=…` (or `/shop` when no product) if logged in, else
  `/signup?next=<encoded target>`. Replaces the hard-coded `/signup` CTAs in
  `page.tsx`, `site-nav.tsx`, and product pages.
- **New server actions & their guards:**

  | Action | File | Guard |
  |---|---|---|
  | `createOrderAction` | `app/checkout/actions.ts` | `requireCustomer`; product must be `ACTIVE`; qty 1–10; allocation transaction (see 8.2). |
  | `claimTagAction` | `app/claim/actions.ts` | `requireCustomer`; rate-limited per user + per code; tag must have matching `claimCode` and `userId IS NULL`; generic error otherwise. |
  | `updateEmergencyProfileAction` | `app/dashboard/profile/actions.ts` | `requireCustomer`; upsert on `userId`. |
  | `uploadProfilePhotoAction` / `deleteProfilePhotoAction` | same | `requireCustomer`; validate + process via `lib/media.ts`; asset `ownerId = user.id`. |
  | `addContactAction` / `updateContactAction` / `deleteContactAction` / `reorderContactsAction` | same | `requireCustomer`; contact's `profile.userId === user.id`; max 5. |
  | `updatePrivacyAction` | `app/dashboard/privacy/actions.ts` | `requireCustomer`; sets booleans + derives `visibilityPreset`; preset button sets booleans via `lib/privacy.ts`. |
  | `updateTagAction` | `app/dashboard/tags/[id]/actions.ts` | **rewritten**: `requireCustomer` + `where: { id, userId }`; only `internalLabel` + `status ∈ {ACTIVE, LOST, DEACTIVATED}`. No public-profile fields (moved to profile). |
  | `createProductAction` / `updateProductAction` / `archiveProductAction` / `uploadProductImageAction` | `app/admin/products/actions.ts` | `requireAdmin`. |
  | `updateOrderStatusAction` / `updateFulfillmentAction` / `issueReplacementTagAction` | `app/admin/orders/actions.ts` | `requireAdmin`; state-machine-valid transitions only. |
  | `generateTagBatchAction` | `app/admin/tags/actions.ts` | **extended**: `requireAdmin`; `createMany` with `skipDuplicates`, retry the shortfall; records a `TagBatch`. |
  | `returnTagToInventoryAction` / `markTagLostAction` | `app/admin/tags/actions.ts` / `app/admin/actions.ts` | `requireAdmin`; `returnTagToInventory` scrubs `userId`, `orderItemId`, `internalLabel`, status → `UNASSIGNED` (extends today's `setTagStatusAction` UNASSIGNED branch). |

---

## 8. Feature specs

### 8.1 Storefront (`/shop`, `/shop/[slug]`)

- `/shop` — server component. `prisma.product.findMany({ where: { status:
  "ACTIVE" }, orderBy: { sortOrder: "asc" } })`. Card grid: product image
  (`<img src="/media/{imageAssetId}">`), name, tagline, price
  (`BDT 299 · one-time`), "Get yours" button. Empty state (no active products)
  → illustration + "Products coming soon".
- `/shop/[slug]` — product image, name, tagline, description, use case, price
  with an explicit **"One-time purchase — no subscription"** badge,
  `<GetYourTagButton product={slug}>`. `notFound()` if slug missing or not
  `ACTIVE`.
- No cart model. Quantity is chosen on `/checkout`.
- Price formatting helper `formatPrice(cents, currency)` in `src/lib/money.ts`
  (extracted from the copies in `pricing`/`billing`).

### 8.2 Checkout & orders

`/checkout?product=slug&qty=n`:

1. `src/lib/cart.ts` `parseCheckoutParams(searchParams)` → `{ product, qty }` or
   a redirect to `/shop` on invalid input. Loads the `ACTIVE` product.
2. Page shows the line (name, unit price, qty stepper 1–10, subtotal), an
   optional shipping form (`shipName`, `shipPhone`, `shipAddress`, `shipCity`,
   `shipNote`), and a "Pay (demo)" button. A notice: payments run in demo mode,
   no real charge.
3. `createOrderAction(formData)`:
   - `requireCustomer()`. Re-validate product `ACTIVE` and qty.
   - **One transaction:**
     a. Count `UNASSIGNED` tags for the product with `orderItemId IS NULL`. If
        `< qty` → abort with `"Out of stock"` (nothing written); log a
        server-side warning for the admin. (Future: auto-notify.)
     b. Create `Order` (`PENDING`, `subtotalCents = totalCents = unit*qty`,
        `orderNumber` from `lib/order.ts`), and one `OrderItem`
        (`unitPriceCents` snapshot).
     c. Allocate: `updateMany({ where: { productId, status: "UNASSIGNED",
        orderItemId: null }, data: { orderItemId, status: "ALLOCATED" },
        take: qty })` — Prisma lacks `take` on `updateMany`, so select `qty`
        ids `FOR UPDATE SKIP LOCKED` via `$queryRaw` then `updateMany({ where: {
        id: { in: ids } } })`. Assert `count === qty`; otherwise throw to roll
        back (concurrency lost the race — the client retries).
     d. Create `Payment` (`kind = ORDER`, `provider = DEMO`,
        `status = SUCCEEDED`, `providerRef = "demo_<ts>"`).
     e. `Order.status = PAID`, `placedAt = now`. Tags → `userId = buyer`,
        `status = ACTIVE` (D6).
   - Redirect to `/checkout/success?order=<orderNumber>`.
4. `/checkout/success` — loads the order (scoped to `userId`), lists each tag:
   `/t/<shortCode>` link + `claimCode` + "Set up emergency info" →
   `/dashboard/profile`. If the user has no `EmergencyProfile` yet, a prominent
   "Your tags are live — add your emergency info so they're useful" banner.

Order-number format: `JJ-` + 6 chars from the `short-code` unambiguous alphabet,
uniqueness-checked with a short retry loop.

### 8.3 Claim flow

`/claim` → input (auto-uppercase, accepts with/without dashes) → `/claim/[code]`.

`/claim/[code]`:
- Normalise the code. `prisma.tag.findUnique({ where: { claimCode } })`.
- Rate-limit `claim:<userId>` (10 / 10 min) and `claim-code:<code>` (5 / 10 min).
- If no tag, or `tag.userId` is set, or `tag.status === "DEACTIVATED"` → generic
  `"That code isn't valid or has already been used."` (no enumeration).
- Else show product + "This will link the tag to your account" → confirm →
  `claimTagAction`: guarded `updateMany({ where: { id, claimCode, userId: null },
  data: { userId, status: "ACTIVE" } })`; assert `count === 1`. Redirect to
  `/dashboard/tags/[id]`.

`src/lib/claim-code.ts` — `generateClaimCode()` returns
`XXXX-XXXX-XXXX` from a 31-char unambiguous uppercase-only alphabet
(`23456789ABCDEFGHJKLMNPQRSTVWXYZ`), distinct from `shortCode`'s mixed-case
56-char alphabet. `normalizeClaimCode(input)` strips non-alphanumerics and
upper-cases.

### 8.4 Emergency profile (`/dashboard/profile`)

- Load or lazily create the `EmergencyProfile` for the user (upsert on first
  visit so the editor always has a row).
- Sections: **Photo** (current photo or placeholder illustration; upload /
  replace / remove), **Identity** (`displayName`, defaulting placeholder shows
  `User.name`), **Emergency message** (textarea, max 500), **Medical**
  (`bloodGroup` select, `allergies` + `medicalNotes` textareas), **Emergency
  contacts** (list; add/edit/remove; `name` required, `relation`/`phone`/`email`
  optional; per-contact `isPublic`; drag-or-arrow reorder; max 5), **How finders
  reach you** (`contactMode`: RELAY vs DIRECT_CALL; if DIRECT_CALL, `phonePublic`
  required + a warning it will be visible publicly — **S1**).
- All writes via the actions in 7. `revalidatePath("/dashboard/profile")`,
  `/dashboard/privacy`, `/dashboard`.

### 8.5 Privacy model (`/dashboard/privacy`)

- Three preset buttons (Minimal / Standard / Full) — each calls
  `updatePrivacyAction({ preset })` which applies the 4.9 mapping.
- Below: a table of individual toggles (photo, name, emergency message, blood
  group, allergies, medical notes, emergency contacts, phone number). Toggling
  any one calls `updatePrivacyAction({ field, value })`, which flips just that
  boolean and sets `visibilityPreset = CUSTOM` (unless the resulting set exactly
  matches a preset, in which case snap to it).
- Right column: **live preview** — renders the same
  `<PublicProfileCard view={buildPublicProfileView(profile, contacts)}>`
  component the scan page uses, so the user sees exactly what a finder sees.
- `src/lib/privacy.ts`: `PRESET_FLAGS`, `applyPreset(preset)`,
  `detectPreset(flags)`.

### 8.6 Profile photo / MediaAsset

- `uploadProfilePhotoAction(formData)` — `requireCustomer`; read the `File`;
  `lib/media.ts` `processImage(buffer, { kind: "PROFILE_PHOTO" })` →
  `{ data, mimeType, width, height, byteSize, checksum }`; create `MediaAsset`
  (`ownerId = user.id`); set `profile.photoAssetId`; delete the previous asset
  row best-effort.
- `deleteProfilePhotoAction` — null out `photoAssetId`, delete the asset row.
- `GET /media/[id]/route.ts` — `findUnique`; 404 if missing; `If-None-Match`
  match → `304`; else return `data` with the cache + ETag headers in 4.11.
- `lib/media.ts` also exposes `renderSvgToWebp(svg, size)` for the seed's
  placeholder product images.

### 8.7 Public scan page (`/t/[shortCode]`)

- Load: `prisma.tag.findUnique({ where: { shortCode }, include: { product: true,
  user: { include: { emergencyProfile: { include: { contacts: true } } } } } })`.
- `notFound()` if no tag or `status === "DEACTIVATED"`.
- Scan logging unchanged (hashed IP, rate-limited `ScanEvent`).
- `status ∈ {UNASSIGNED, ALLOCATED}` **or** owner has no `EmergencyProfile` →
  "not set up yet" card (friendly, subtle illustration).
- Otherwise build `view = buildPublicProfileView(profile, contacts, { lost:
  status === "LOST" })` and render `<PublicProfileCard view={view}>`:
  - `<PublicProfileCard>` (`src/components/public-profile-card.tsx`) is shared
    UI, built in phase 3 (it is also mounted in the `/dashboard/privacy` live
    preview) and consumed by the phase-4 scan-page rewrite.
  - `src/lib/public-profile.ts` — **the single source of truth for what is
    public**. Input: the full profile + contacts. Output: a plain DTO with only
    permitted fields —
    `{ lost, displayName?, photoUrl?, emergencyMessage?, bloodGroup?, allergies?,
    medicalNotes?, contactMode, phonePublic?, contacts: {name, relation?,
    phone?, email?}[] }`. A field is present only if its `*Public` flag is true
    (and, for contacts, the per-contact `isPublic`). `displayName` falls back to
    `"Someone's belongings"` when `namePublic` is false — **never** the real
    name. `photoUrl` is `/media/<id>` only when `photoPublic` and a photo
    exists. No `User` object, no account `phone`, no non-public medical data
    ever crosses into the DTO.
  - Card layout: wordmark → LOST banner (if `lost`) → photo → display name →
    "Emergency information" heading → emergency message → medical block (only
    rendered fields) → primary action (RELAY `<RelayForm>` — kept — or
    DIRECT_CALL `tel:` button) → public emergency contacts (name, relation,
    call/email buttons) → "The owner's account details are never shown unless
    they chose to share them." → `<ReportAbuseLink>` (kept).
- Mobile-first, single card, server-rendered, no blocking JS, at most a tiny
  static header mark. No entrance animation.

### 8.8 Dashboard IA

- `dashboard/layout.tsx` nav → **Overview · My Profile · Privacy · My Tags ·
  Orders · Messages · Settings** (+ **Subscription** only when
  `PREMIUM_ENABLED`).
- `dashboard/page.tsx` overview → profile-completeness meter (photo? message?
  ≥1 contact? contact mode set?), tag counts by status, recent 5 scans, recent 5
  messages, recent 3 orders, quick links. Each empty region gets an
  illustration + one-line prompt.
- Remove all `Item` imports/queries. Relay/message "item label" references →
  `tag.internalLabel ?? tag.product?.name ?? tag.shortCode`.

### 8.9 Admin

- `admin/layout.tsx` nav gains a **Store** section: Products, Orders — above the
  existing Tag management / Customers / Monitoring groups.
- `admin/page.tsx` — add tiles: active products, orders (7-day), revenue
  (`SUCCEEDED` `kind=ORDER` sum), tags allocated-not-active.
- Products & Orders pages per 6.3. Reuse the table styling already in
  `admin/tags/page.tsx`.
- `admin/tags` — `GenerateTagsButton` becomes `GenerateTagBatchForm` (adds
  product select + batch label). `generateTagsAction` → `generateTagBatchAction`
  using `createMany({ skipDuplicates: true })` in chunks, retrying only the
  shortfall (**S6**), and recording a `TagBatch`.
- `admin/payments/page.tsx` — widen include to cover `kind = ORDER` (join
  `order.user` / `orderItem.product`) and branch the row rendering on `kind`.
- `AssignTagForm` (manual admin assignment) is **kept** but its subscription /
  `maxTags` checks are **removed** — it simply moves an `UNASSIGNED` tag to a
  chosen customer as `ACTIVE` (useful for support/comps). Ownership + role +
  status checks stay.

### 8.10 Visual / illustration system

- **No animation library.** New deps limited to `vitest` (dev) and promoting
  `sharp` to an explicit dependency.
- `src/components/illustrations/` — inline-SVG React components: one friendly
  rounded "blob" mascot in ~5 poses (`MascotWave`, `MascotSearch`,
  `MascotCheer`, `MascotThink`, `MascotShield`) + spot art (`EmptyTags`,
  `EmptyOrders`, `EmptyMessages`, `EmptyInbox`). ~2-colour, currentColor-aware,
  ≤ 3 KB each.
- `src/app/globals.css` — warm the tokens: keep emerald `--color-primary`, add
  `--color-accent` (soft coral/amber, e.g. `#F98A6B`), `--color-surface`
  (off-white, e.g. `#FBF9F6`). Drop the Arial-only `body` rule; `body` uses
  `var(--font-geist-sans)` (already loaded in `layout.tsx`) with a
  `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
  fallback. Add `@keyframes float / wave / pulse-soft`, all wrapped in
  `@media (prefers-reduced-motion: no-preference)`.
- `src/components/ui/` — small shared primitives extracted from repeated markup:
  `Card`, `Field` (label + input + error), `Toggle`, `Badge`, `Price`,
  `PageHeader`. Used by new pages; existing pages migrated only where touched.
- Applied at: `/` hero, `/shop` + empty state, all dashboard empty states,
  `/checkout/success`, `/claim/[code]` success, `not-found.tsx`. **Not** the
  scan page.

---

## 9. Library modules

| File | Status | Purpose |
|---|---|---|
| `src/lib/session.ts` | kept | Authorization helpers. |
| `src/lib/qr.ts` | kept | QR generation. |
| `src/lib/short-code.ts` | kept | Tag `shortCode` generator. |
| `src/lib/claim-code.ts` | new | `generateClaimCode`, `normalizeClaimCode`. |
| `src/lib/order.ts` | new | `generateOrderNumber`, `allocateTagsForOrderItem` (raw-SQL `SKIP LOCKED` select + `updateMany`). |
| `src/lib/cart.ts` | new | `parseCheckoutParams`. |
| `src/lib/money.ts` | new | `formatPrice`. |
| `src/lib/media.ts` | new | `processImage`, `renderSvgToWebp`, mime/size allowlist. |
| `src/lib/public-profile.ts` | new | `buildPublicProfileView` — privacy source of truth. |
| `src/lib/privacy.ts` | new | `PRESET_FLAGS`, `applyPreset`, `detectPreset`. |
| `src/lib/validations.ts` | changed | Remove `itemSchema`, `signupSchema.planSlug`, `tagCustomerUpdateSchema` public fields. Add `productSchema`, `checkoutSchema`, `emergencyProfileSchema`, `emergencyContactSchema`, `privacySchema`, `claimSchema`, `orderStatusSchema`. Rename `abuseReportSchema.tagId` → `shortCode`. |
| `src/lib/rate-limit.ts` `hash.ts` `client-ip.ts` `user-agent.ts` `notify.ts` `prisma.ts` | kept | As-is. |

---

## 10. Security fixes

| # | Fix |
|---|---|
| **S1** | `phonePublic` is format-validated; the profile + privacy UIs state plainly that it is shown to anyone who scans. `DIRECT_CALL` requires `phonePublic`. |
| **S2** | The scan page renders only the `buildPublicProfileView` DTO. Real `User.name` is never used as a fallback; account `phone` and non-public medical fields never enter the DTO; item photos no longer exist. |
| **S3** | `Tag.userId` → `onDelete: SetNull`. `returnTagToInventoryAction` and a `releaseTagToInventory` helper scrub owner-linked data. |
| **S4** | `abuseReportSchema` field renamed `shortCode`; lookup unchanged, rate-limited as today. |
| **S5** | Spec note only: seed admin password remains `ChangeMe123!` with the existing "change immediately" warning; email verification stays out of scope. README updated to restate this. |
| **S6** | Batch generation uses `createMany({ skipDuplicates: true })` with shortfall retry instead of N single inserts. |
| new | `?next=` redirect params validated (must start with a single `/`, reject `//` and `/\`) before use in `signup`/`login`/`proxy`. |
| new | Checkout allocation uses `SELECT … FOR UPDATE SKIP LOCKED` so two concurrent buyers can't be allocated the same tag; post-condition asserts exact count. |

---

## 11. Testing (Vitest — minimal)

- Add `vitest` (dev) + `vitest.config.ts` + `"test": "vitest run"` script.
- `src/lib/__tests__/public-profile.test.ts` — for every `*Public=false`, the
  corresponding key is absent from the DTO; `namePublic=false` yields the
  generic label, never the real name; a non-public contact is excluded even when
  `contactsPublic=true`; account `phone` is never present.
- `src/lib/__tests__/privacy.test.ts` — `applyPreset` / `detectPreset`
  round-trip for MINIMAL/STANDARD/FULL; a single manual toggle yields `CUSTOM`.
- `src/lib/__tests__/claim-code.test.ts` — format, alphabet exclusivity vs
  `shortCode` alphabet, `normalizeClaimCode` idempotence.
- `src/lib/__tests__/order.test.ts` — `generateOrderNumber` shape/uniqueness
  over N; `allocateTagsForOrderItem` with a stubbed tx: exact-count success,
  short-inventory abort, no partial writes. (Pure/stubbed — no live DB.)

Not in scope: component tests, e2e, route integration tests.

---

## 12. Verification gates (run after every implementation step)

1. `npx prisma validate`
2. `npx prisma generate`
3. `npx tsc --noEmit`
4. `npm run lint`
5. `npm test` (once Vitest is added)
6. For migration steps: `npx prisma migrate diff --from-migrations
   ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma
   --exit-code` returns clean; migration applied on a scratch DB without error.
7. Manual route smoke list (documented in the implementation plan): signup
   (no plan) → shop → product → checkout → success → profile → privacy preview →
   `/t/<code>` shows only public fields → claim a second code → admin products →
   admin generate batch → admin order detail.

---

## 13. Rollout sequence (phases for the implementation plan)

1. **Schema M1 + backfill + M2** — additive migration, backfill script, tighten.
   Gate. (No UI yet; app still runs on the old code paths that read the kept
   columns.)
2. **Lib layer** — `money`, `claim-code`, `order`, `cart`, `media`,
   `public-profile`, `privacy`, `validations` changes, Vitest + the four test
   files. Gate.
3. **Profile + Privacy + MediaAsset serving** — `/dashboard/profile`,
   `/dashboard/privacy`, `/media/[id]`, dashboard nav change. Gate.
4. **Scan page rewrite** — `/t/[shortCode]` on the DTO. Gate + manual scan
   check.
5. **Storefront + checkout + claim** — `/shop`, `/shop/[slug]`, `/checkout`,
   `/checkout/success`, `/claim`, `<GetYourTagButton>`, `signup`/`login`
   `?next=`, `/pricing` redirect, seed products. Gate + manual purchase check.
6. **Admin store** — products, orders, batch generation, `/admin/tags/[id]`,
   payments page widening, overview tiles, `AssignTagForm` de-gating. Gate.
7. **Dashboard tags/orders/overview + messages cleanup** — `/dashboard/tags*`
   rewrite, `/dashboard/orders*`, overview, remove `/dashboard/items`,
   `/dashboard/billing` → `/dashboard/subscription` (flag-gated). Gate.
8. **Migration M3 (destructive)** — drop `Item` + old `Tag` columns + old
   `ContactMode`. Only after phases 3–7 no longer reference them. Gate.
9. **Visual pass** — illustrations, `globals.css` tokens/animations, `ui/`
   primitives applied to new pages + `not-found.tsx`, README update. Gate.

Each phase ends green on all applicable gates before the next begins. Phase 8
must be last among the schema changes.

---

## 14. Out of scope / future

- Real payment gateway + webhooks (write to `Payment`).
- Email/SMS notification delivery.
- Scan geolocation population (`ScanEvent.approx*`).
- Account self-deletion UI (the `releaseTagToInventory` helper is built; no
  page).
- Multiple emergency profiles per account; per-tag profile overrides.
- Launched premium tier (define entitlements, enable `PREMIUM_ENABLED`).
- Product physical attributes, inventory reorder alerts, discount codes,
  multi-line carts in the checkout UI.
- Moving the in-memory rate limiter to a shared store (needed only for
  multi-instance deploys — already documented).

## 15. Decisions requiring approval

None outstanding. D1–D8 are locked (section 2). This spec is ready for an
implementation plan.
