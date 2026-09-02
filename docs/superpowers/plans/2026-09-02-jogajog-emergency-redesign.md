# Jogajog Emergency Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split Jogajog Emergency into a physical QR-sticker store (one-time purchase → order → tag inventory → account) and a SaaS emergency-profile platform (profile, privacy controls, public scan page), removing the subscription-gated tag generation and the Item/belongings model.

**Architecture:** Next.js 16 App Router, server components + server actions, Prisma/Postgres. Authorization stays centralised in `src/lib/session.ts`; every server action re-checks the active user and scopes writes by ownership. A single `buildPublicProfileView` DTO is the only thing the public scan page may render. Media (profile/product images) is stored as bytes in Postgres and served through a cached route. Migrations are additive-first; the one destructive migration (drop `Item` + old `Tag` columns) runs last, after all code stops referencing them.

**Tech Stack:** Next.js 16.3, React 19, Prisma 6 + PostgreSQL, Auth.js v5 (Credentials/JWT), Tailwind v4, `sharp` (image processing — already installed as a Next optional dep, promote to explicit dependency), `qrcode`, `nanoid`, `zod`, `bcryptjs`. New dev dependency: `vitest`.

**Spec:** `docs/superpowers/specs/2026-09-02-jogajog-emergency-redesign-design.md` — read it alongside this plan; task rationale lives there.

## Global Constraints

- **Next.js is a modified build** — read `node_modules/next/dist/docs/` for any API you're unsure of. Proxy file is `src/proxy.ts` (not `middleware.ts`).
- **Money:** integer minor units, field suffix `Cents`; default currency `"BDT"`. Format via `src/lib/money.ts` `formatPrice(cents, currency)`.
- **IDs:** `cuid()` everywhere.
- **Auth:** every server action calls `requireCustomer()` / `requireAdmin()` from `src/lib/session.ts`; every write is scoped `where: { id, <ownerKey> }` or a guarded `updateMany`. Never trust an id from the client alone.
- **No new runtime dependencies** beyond promoting `sharp`. `vitest` is dev-only. No animation library.
- **Public scan page** may render **only** the `PublicProfileView` DTO from `src/lib/public-profile.ts` — never a `User`/`EmergencyProfile`/`Tag` object directly.
- **Migrations:** never `prisma migrate reset`. Run `npx prisma validate && npx prisma generate && npx tsc --noEmit && npm run lint` after every task; add `npm test` once Task 2.1 lands.
- **Commits:** end every commit message with
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` then
  `Claude-Session: https://claude.ai/code/session_01VrbTwcDJauAsfWM5XX22Bq`.
- **Redirect params:** any `?next=` value must be validated with `isSafeNext(v)` (starts with a single `/`, not `//`, not `/\`) before use.
- **Branch:** `redesign/physical-store-and-profile`. Spec + WIP baseline already committed.

---

## File Structure

### New library modules (`src/lib/`)
| File | Responsibility |
|---|---|
| `money.ts` | `formatPrice(cents, currency)` |
| `nav.ts` | `isSafeNext(value): boolean` |
| `claim-code.ts` | `generateClaimCode()`, `normalizeClaimCode(input)` |
| `short-code.ts` *(exists)* | unchanged |
| `order.ts` | `generateOrderNumber()`, `allocateTags(tx, { productId, orderItemId, quantity })` |
| `cart.ts` | `parseCheckoutParams(searchParams)` → `{ product, quantity }` or `null` |
| `media.ts` | `processImage(buffer, kind)`, `renderSvgToWebp(svg, size)`, allowlists |
| `public-profile.ts` | `buildPublicProfileView(profile, contacts, opts)` → `PublicProfileView` |
| `privacy.ts` | `PRESET_FLAGS`, `applyPreset(preset)`, `detectPreset(flags)` |
| `premium.ts` | `isPremiumEnabled()` → reads `process.env.PREMIUM_ENABLED === "1"` |

### New components
| File | Responsibility |
|---|---|
| `src/components/get-your-tag-button.tsx` | Auth-aware CTA (server component) |
| `src/components/public-profile-card.tsx` | Renders a `PublicProfileView` (scan page + privacy preview) |
| `src/components/illustrations/*.tsx` | Inline-SVG mascot + spot art |
| `src/components/ui/*.tsx` | `Card`, `Field`, `Toggle`, `Badge`, `Price`, `PageHeader` |

### New routes — see spec §6. Created across phases 3–7.

### Prisma
`prisma/schema.prisma` (rewritten in stages), `prisma/backfill-redesign.ts` (new), `prisma/seed.ts` (extended), `prisma/migrations/*` (M1, M2, M3).

---

# PHASE 1 — Schema M1 + backfill + M2

Additive migration, backfill script, tighten migration. No UI changes; the app keeps running on existing code paths (which still read the kept columns).

### Task 1.1: Promote `sharp`, add `PREMIUM_ENABLED` to env docs

**Files:**
- Modify: `package.json` (dependencies)
- Modify: `.env` (add `PREMIUM_ENABLED=0`)
- Modify: `README.md` (env table)

- [ ] **Step 1:** Add `"sharp": "^0.35.3"` to `dependencies` in `package.json` (keep alphabetical order near `react`/`qrcode`). Run `npm install` — confirm no lockfile churn beyond `sharp` moving to a direct dep.
- [ ] **Step 2:** Append to `.env`:
  ```
  # Optional premium/subscription UI (0 = hidden, default)
  PREMIUM_ENABLED=0
  ```
- [ ] **Step 3:** In `README.md`, under the deployment env list, add `PREMIUM_ENABLED` (default `0`) and note `sharp` is now a direct dependency for image processing.
- [ ] **Step 4:** Run `npx tsc --noEmit && npm run lint`. Expected: pass.
- [ ] **Step 5:** Commit: `chore: promote sharp to a direct dependency, add PREMIUM_ENABLED flag`

### Task 1.2: Write the M1 additive migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_store_profile_privacy_media/migration.sql`

**Interfaces:**
- Produces: all new models/enums per spec §4; `Tag` gains nullable `claimCode`, `productId`, `batchId`, `orderItemId`, `internalLabel`; `Tag.userId` FK → `ON DELETE SET NULL`; `Payment` gains `kind NOT NULL DEFAULT 'ORDER'`, nullable `orderId`, nullable `subscriptionId`; `TagStatus` gains `ALLOCATED`; `ContactMode` gains `DIRECT_CALL`.

- [ ] **Step 1:** Edit `prisma/schema.prisma` to the **M1 intermediate state**:
  - Add enums exactly as spec §4: `ProductStatus { DRAFT ACTIVE ARCHIVED }`, `OrderStatus { PENDING PAID CANCELLED REFUNDED }`, `FulfillmentStatus { UNFULFILLED PROCESSING SHIPPED DELIVERED }`, `PaymentKind { ORDER SUBSCRIPTION }`, `VisibilityPreset { MINIMAL STANDARD FULL CUSTOM }`, `MediaKind { PROFILE_PHOTO PRODUCT_IMAGE }`.
  - `enum TagStatus` → add `ALLOCATED` (order: `UNASSIGNED ALLOCATED ACTIVE LOST DEACTIVATED`).
  - `enum ContactMode` → `RELAY MASKED_PHONE DIRECT_CALL` (keep `MASKED_PHONE` for now; removed in M3).
  - Add models `Product`, `TagBatch`, `Order`, `OrderItem`, `EmergencyProfile`, `EmergencyContact`, `MediaAsset` exactly as spec §4.4–4.11, **except** `Tag.claimCode` stays `String?` (no `@unique` yet) at this stage.
  - `Tag`: add `productId String?`, `batchId String?`, `orderItemId String?`, `internalLabel String?`, relations `product`, `batch`, `orderItem` (with `onDelete: SetNull` on `orderItem`), keep existing `publicDisplayName`/`publicMessage`/`maskedPhone`/`contactMode`/`itemId` columns for now. Change `user User? @relation(...) ` to `onDelete: SetNull`. Add `@@index` for `productId`, `orderItemId`, `status`.
  - `Payment`: add `kind PaymentKind @default(ORDER)`, `orderId String?`, change `subscriptionId String` → `String?`, relations `order Order?`, make `subscription` optional. Add `@@index([orderId])`.
  - `User`: add relations `emergencyProfile EmergencyProfile?`, `orders Order[]`, `mediaAssets MediaAsset[] @relation("MediaOwner")`, `tagBatches TagBatch[]`. Keep `items Item[]` for now.
- [ ] **Step 2:** Run `npx prisma validate`. Expected: valid.
- [ ] **Step 3:** Generate the migration without applying against a shared DB: `npx prisma migrate dev --name add_store_profile_privacy_media --create-only`.
- [ ] **Step 4:** Hand-edit the generated `migration.sql`:
  - Replace Prisma's `Tag.userId` FK drop/recreate with an explicit
    `ALTER TABLE "Tag" DROP CONSTRAINT "Tag_userId_fkey";`
    `ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;`
  - Ensure `ALTER TYPE "TagStatus" ADD VALUE 'ALLOCATED';` and `ALTER TYPE "ContactMode" ADD VALUE 'DIRECT_CALL';` appear before any use. (Postgres requires `ADD VALUE` outside a transaction for older versions; Prisma 6 handles this — if `migrate dev` errors on it, split those two `ALTER TYPE` lines into their own earlier migration `add_enum_values`.)
- [ ] **Step 5:** Apply: `npx prisma migrate dev` (applies the created migration). Then `npx prisma generate`.
- [ ] **Step 6:** `npx tsc --noEmit` — expect failures only in files that reference not-yet-updated relations? No — M1 is purely additive to the schema; existing code still compiles because all old columns remain. If `tsc` fails, fix the schema, not the app.
- [ ] **Step 7:** `npm run lint`. Expected: pass.
- [ ] **Step 8:** Commit: `feat(db): M1 additive migration for store, profile, privacy, media`

### Task 1.3: Backfill script

**Files:**
- Create: `prisma/backfill-redesign.ts`
- Modify: `package.json` (`"db:backfill": "tsx prisma/backfill-redesign.ts"`)

**Interfaces:**
- Consumes: M1 schema. Uses `generateClaimCode` — but `src/lib/claim-code.ts` doesn't exist until Phase 2. **Inline a local `randomClaimCode()` in the script** (same alphabet as spec §8.3: `23456789ABCDEFGHJKLMNPQRSTVWXYZ`, `XXXX-XXXX-XXXX`) so Phase 1 has no dependency on Phase 2.
- Produces: every `Tag` has `productId` + `claimCode`; every multi-tag-owning `User` has an `EmergencyProfile`; every `Payment` has `kind`.

- [ ] **Step 1:** Write `prisma/backfill-redesign.ts`. Structure:
  ```ts
  import { PrismaClient } from "@prisma/client";
  const prisma = new PrismaClient();
  const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTVWXYZ";
  function randomClaimCode() {
    const pick = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
    return `${pick()}-${pick()}-${pick()}`;
  }
  async function main() {
    // 1. Legacy product
    const legacy = await prisma.product.upsert({
      where: { slug: "legacy-tag" },
      update: {},
      create: { slug: "legacy-tag", name: "Legacy Tag", tagline: "Pre-redesign tag", description: "Issued before the store existed.", priceCents: 0, status: "ARCHIVED", sortOrder: 999 },
    });
    const noProduct = await prisma.tag.updateMany({ where: { productId: null }, data: { productId: legacy.id } });

    // 2. internalLabel <- Item.label
    const tagsWithItem = await prisma.tag.findMany({ where: { itemId: { not: null }, internalLabel: null }, include: { item: true } });
    for (const t of tagsWithItem) {
      if (t.item) await prisma.tag.update({ where: { id: t.id }, data: { internalLabel: t.item.label } });
    }

    // 3. claimCode
    const noCode = await prisma.tag.findMany({ where: { claimCode: null }, select: { id: true } });
    for (const t of noCode) {
      for (let i = 0; i < 5; i++) {
        try { await prisma.tag.update({ where: { id: t.id }, data: { claimCode: randomClaimCode() } }); break; }
        catch { /* unique collision, retry */ }
      }
    }

    // 4. EmergencyProfile per owning user
    const owners = await prisma.user.findMany({
      where: { tags: { some: {} }, emergencyProfile: null },
      include: { tags: { orderBy: { updatedAt: "desc" }, take: 1 } },
    });
    for (const u of owners) {
      const t = u.tags[0];
      const direct = t?.contactMode === "MASKED_PHONE";
      await prisma.emergencyProfile.create({
        data: {
          userId: u.id,
          displayName: t?.publicDisplayName ?? u.name,
          emergencyMessage: t?.publicMessage ?? null,
          contactMode: direct ? "DIRECT_CALL" : "RELAY",
          phonePublic: t?.maskedPhone ?? null,
          showPhone: direct,
          visibilityPreset: "STANDARD",
          photoPublic: true, namePublic: true, messagePublic: true, contactsPublic: true,
          bloodGroupPublic: false, allergiesPublic: false, medicalNotesPublic: false,
        },
      });
    }

    // 5. Payment.kind
    const pay = await prisma.payment.updateMany({ where: {}, data: { kind: "SUBSCRIPTION" } });

    console.log({ noProduct: noProduct.count, itemLabels: tagsWithItem.length, claimCodes: noCode.length, profiles: owners.length, payments: pay.count });
  }
  main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
  ```
- [ ] **Step 2:** Add `"db:backfill": "tsx prisma/backfill-redesign.ts"` to `package.json` scripts.
- [ ] **Step 3:** Run `npm run db:backfill`. Expected: prints a summary object, no throw. On a fresh dev DB with no data it prints all zeros — still a pass.
- [ ] **Step 4:** Run it again. Expected: same or all-zero counts (idempotent), no unique-constraint crash.
- [ ] **Step 5:** `npx tsc --noEmit && npm run lint`. Expected: pass.
- [ ] **Step 6:** Commit: `feat(db): idempotent backfill for products, claim codes, emergency profiles`

### Task 1.4: M2 tighten migration

**Files:**
- Modify: `prisma/schema.prisma` (`Tag.claimCode` → `String @unique`)
- Create: `prisma/migrations/<timestamp>_require_tag_claim_code/migration.sql`

- [ ] **Step 1:** Change `claimCode String?` → `claimCode String @unique` in the `Tag` model.
- [ ] **Step 2:** `npx prisma migrate dev --name require_tag_claim_code`. If it complains about nulls, the backfill (1.3 step 3) didn't run against this DB — run `npm run db:backfill` first.
- [ ] **Step 3:** `npx prisma generate && npx prisma validate`.
- [ ] **Step 4:** `npx tsc --noEmit && npm run lint`. Expected: pass.
- [ ] **Step 5:** Commit: `feat(db): M2 require unique Tag.claimCode`

---

# PHASE 2 — Library layer + Vitest

Pure logic + tests. No routes yet.

### Task 2.1: Vitest setup + `money.ts` + `nav.ts`

**Files:**
- Create: `vitest.config.ts`, `src/lib/money.ts`, `src/lib/nav.ts`, `src/lib/__tests__/money.test.ts`, `src/lib/__tests__/nav.test.ts`
- Modify: `package.json` (`"test": "vitest run"`, devDep `vitest`)

**Interfaces:**
- Produces: `formatPrice(cents: number, currency: string): string` → e.g. `formatPrice(29900, "BDT")` === `"BDT 299"`. `isSafeNext(value: string | null | undefined): boolean`.

- [ ] **Step 1:** `npm install -D vitest`.
- [ ] **Step 2:** `vitest.config.ts`:
  ```ts
  import { defineConfig } from "vitest/config";
  export default defineConfig({ test: { include: ["src/**/*.test.ts"], environment: "node" } });
  ```
- [ ] **Step 3:** Add `"test": "vitest run"` to `package.json` scripts.
- [ ] **Step 4:** Write `src/lib/__tests__/money.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { formatPrice } from "../money";
  describe("formatPrice", () => {
    it("renders whole BDT with no decimals", () => expect(formatPrice(29900, "BDT")).toBe("BDT 299"));
    it("thousands separator", () => expect(formatPrice(123456700, "BDT")).toBe("BDT 1,234,567"));
    it("keeps non-integer taka as decimals", () => expect(formatPrice(29950, "BDT")).toBe("BDT 299.5"));
  });
  ```
- [ ] **Step 5:** Run `npm test` — expect FAIL (module missing).
- [ ] **Step 6:** Write `src/lib/money.ts`:
  ```ts
  export function formatPrice(cents: number, currency: string): string {
    const value = cents / 100;
    return `${currency} ${value.toLocaleString("en-US")}`;
  }
  ```
- [ ] **Step 7:** Write `src/lib/__tests__/nav.test.ts`:
  ```ts
  import { describe, it, expect } from "vitest";
  import { isSafeNext } from "../nav";
  describe("isSafeNext", () => {
    it("accepts a plain path", () => expect(isSafeNext("/checkout?product=x")).toBe(true));
    it("rejects protocol-relative", () => expect(isSafeNext("//evil.com")).toBe(false));
    it("rejects backslash trick", () => expect(isSafeNext("/\\evil.com")).toBe(false));
    it("rejects absolute url", () => expect(isSafeNext("https://evil.com")).toBe(false));
    it("rejects empty / nullish", () => { expect(isSafeNext("")).toBe(false); expect(isSafeNext(null)).toBe(false); });
  });
  ```
- [ ] **Step 8:** Write `src/lib/nav.ts`:
  ```ts
  export function isSafeNext(value: string | null | undefined): boolean {
    if (!value) return false;
    if (!value.startsWith("/")) return false;
    if (value.startsWith("//") || value.startsWith("/\\")) return false;
    return true;
  }
  ```
- [ ] **Step 9:** `npm test` — expect PASS. Then `npx tsc --noEmit && npm run lint`.
- [ ] **Step 10:** Commit: `test: add vitest; feat(lib): money + safe-next helpers`

### Task 2.2: `claim-code.ts`

**Files:** Create `src/lib/claim-code.ts`, `src/lib/__tests__/claim-code.test.ts`

**Interfaces:**
- Produces: `generateClaimCode(): string` → `/^[23456789ABCDEFGHJKLMNPQRSTVWXYZ]{4}-…{4}-…{4}$/`. `normalizeClaimCode(input: string): string` → strips non-alphanumerics, upper-cases, re-inserts dashes every 4 chars.

- [ ] **Step 1:** Test:
  ```ts
  import { describe, it, expect } from "vitest";
  import { generateClaimCode, normalizeClaimCode } from "../claim-code";
  const SHORT_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz";
  describe("claim code", () => {
    it("matches the grouped format", () => expect(generateClaimCode()).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTVWXYZ]{4}$/));
    it("uses no lowercase / ambiguous chars (distinct from shortCode alphabet)", () => {
      const body = generateClaimCode().replace(/-/g, "");
      for (const ch of body) expect("01IOUabcdefghijklmnopqrstuvwxyz".includes(ch)).toBe(false);
    });
    it("normalizes messy input", () => {
      expect(normalizeClaimCode(" k7qf3m9pxr2t ")).toBe("K7QF-3M9P-XR2T");
      expect(normalizeClaimCode("K7QF-3M9P-XR2T")).toBe("K7QF-3M9P-XR2T");
    });
    it("is idempotent", () => {
      const c = generateClaimCode();
      expect(normalizeClaimCode(c)).toBe(c);
    });
    void SHORT_ALPHABET;
  });
  ```
- [ ] **Step 2:** `npm test` — FAIL.
- [ ] **Step 3:** Implement:
  ```ts
  import { customAlphabet } from "nanoid";
  const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTVWXYZ";
  const nano = customAlphabet(ALPHABET, 12);
  export function generateClaimCode(): string {
    const s = nano();
    return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
  }
  export function normalizeClaimCode(input: string): string {
    const cleaned = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
    return (cleaned.match(/.{1,4}/g) ?? []).join("-");
  }
  ```
- [ ] **Step 4:** `npm test` PASS; `npx tsc --noEmit && npm run lint`.
- [ ] **Step 5:** Commit: `feat(lib): claim-code generator and normalizer`

### Task 2.3: `privacy.ts`

**Files:** Create `src/lib/privacy.ts`, `src/lib/__tests__/privacy.test.ts`

**Interfaces:**
- Produces:
  - `type VisibilityFlags = { photoPublic; namePublic; messagePublic; bloodGroupPublic; allergiesPublic; medicalNotesPublic; contactsPublic; showPhone }` (all `boolean`).
  - `PRESET_FLAGS: Record<"MINIMAL"|"STANDARD"|"FULL", VisibilityFlags>` — values per spec §4.9 table.
  - `applyPreset(preset): VisibilityFlags`.
  - `detectPreset(flags: VisibilityFlags): "MINIMAL"|"STANDARD"|"FULL"|"CUSTOM"`.

- [ ] **Step 1:** Test:
  ```ts
  import { describe, it, expect } from "vitest";
  import { PRESET_FLAGS, applyPreset, detectPreset } from "../privacy";
  describe("privacy presets", () => {
    it("STANDARD publishes name/photo/message/contacts, hides medical + phone", () => {
      expect(PRESET_FLAGS.STANDARD).toEqual({ photoPublic: true, namePublic: true, messagePublic: true, contactsPublic: true, bloodGroupPublic: false, allergiesPublic: false, medicalNotesPublic: false, showPhone: false });
    });
    it("MINIMAL only publishes the message", () => {
      expect(PRESET_FLAGS.MINIMAL.messagePublic).toBe(true);
      expect(PRESET_FLAGS.MINIMAL.namePublic).toBe(false);
      expect(PRESET_FLAGS.MINIMAL.photoPublic).toBe(false);
    });
    it("FULL publishes everything", () => {
      expect(Object.values(PRESET_FLAGS.FULL).every(Boolean)).toBe(true);
    });
    it("round-trips", () => {
      for (const p of ["MINIMAL", "STANDARD", "FULL"] as const) expect(detectPreset(applyPreset(p))).toBe(p);
    });
    it("a single manual change is CUSTOM", () => {
      expect(detectPreset({ ...PRESET_FLAGS.STANDARD, bloodGroupPublic: true })).toBe("CUSTOM");
    });
  });
  ```
- [ ] **Step 2:** `npm test` FAIL.
- [ ] **Step 3:** Implement with the spec §4.9 table exactly. `detectPreset` compares deep-equal against each preset, else `"CUSTOM"`.
- [ ] **Step 4:** `npm test` PASS; `npx tsc --noEmit && npm run lint`.
- [ ] **Step 5:** Commit: `feat(lib): privacy preset mapping`

### Task 2.4: `public-profile.ts` — the privacy DTO (security-critical)

**Files:** Create `src/lib/public-profile.ts`, `src/lib/__tests__/public-profile.test.ts`

**Interfaces:**
- Consumes: a Prisma `EmergencyProfile` row + `EmergencyContact[]`.
- Produces:
  ```ts
  type PublicContact = { name: string; relation: string | null; phone: string | null; email: string | null };
  type PublicProfileView = {
    lost: boolean;
    displayName: string;            // real name only if namePublic, else "Someone's belongings"
    hasPhoto: boolean;
    photoUrl: string | null;        // `/media/<id>` only if photoPublic && photo exists
    emergencyMessage: string | null;
    bloodGroup: string | null;
    allergies: string | null;
    medicalNotes: string | null;
    contactMode: "RELAY" | "DIRECT_CALL";
    phonePublic: string | null;     // only if showPhone && contactMode DIRECT_CALL
    contacts: PublicContact[];      // only if contactsPublic; each only if isPublic
  };
  function buildPublicProfileView(
    profile: EmergencyProfileWithNulls,
    contacts: EmergencyContact[],
    opts: { lost: boolean }
  ): PublicProfileView;
  ```

- [ ] **Step 1:** Test (`src/lib/__tests__/public-profile.test.ts`) — the leak assertions:
  ```ts
  import { describe, it, expect } from "vitest";
  import { buildPublicProfileView } from "../public-profile";

  const base = {
    id: "p1", userId: "u1", displayName: "Arafat Islam", photoAssetId: "media1",
    bloodGroup: "O+", allergies: "penicillin", medicalNotes: "asthma",
    emergencyMessage: "Please call my brother", contactMode: "RELAY" as const,
    phonePublic: "+880123", visibilityPreset: "CUSTOM" as const,
    photoPublic: false, namePublic: false, messagePublic: false,
    bloodGroupPublic: false, allergiesPublic: false, medicalNotesPublic: false,
    contactsPublic: false, showPhone: false,
    createdAt: new Date(), updatedAt: new Date(),
  };
  const contact = { id: "c1", profileId: "p1", name: "Rahim", relation: "Brother", phone: "+880999", email: null, isPublic: true, sortOrder: 0 };

  it("hides everything when all flags are false", () => {
    const v = buildPublicProfileView(base, [contact], { lost: false });
    expect(v.displayName).toBe("Someone's belongings");
    expect(v.photoUrl).toBeNull();
    expect(v.hasPhoto).toBe(false);
    expect(v.emergencyMessage).toBeNull();
    expect(v.bloodGroup).toBeNull();
    expect(v.allergies).toBeNull();
    expect(v.medicalNotes).toBeNull();
    expect(v.phonePublic).toBeNull();
    expect(v.contacts).toEqual([]);
  });
  it("never leaks the real name when namePublic is false", () => {
    const v = buildPublicProfileView({ ...base, messagePublic: true }, [], { lost: false });
    expect(JSON.stringify(v)).not.toContain("Arafat");
  });
  it("publishes only the enabled fields", () => {
    const v = buildPublicProfileView({ ...base, namePublic: true, photoPublic: true, bloodGroupPublic: true }, [], { lost: true });
    expect(v.displayName).toBe("Arafat Islam");
    expect(v.photoUrl).toBe("/media/media1");
    expect(v.bloodGroup).toBe("O+");
    expect(v.allergies).toBeNull();
    expect(v.lost).toBe(true);
  });
  it("phonePublic requires showPhone AND DIRECT_CALL", () => {
    expect(buildPublicProfileView({ ...base, showPhone: true, contactMode: "RELAY" }, [], { lost: false }).phonePublic).toBeNull();
    expect(buildPublicProfileView({ ...base, showPhone: true, contactMode: "DIRECT_CALL" }, [], { lost: false }).phonePublic).toBe("+880123");
  });
  it("excludes a non-public contact even when contactsPublic is true", () => {
    const v = buildPublicProfileView({ ...base, contactsPublic: true }, [contact, { ...contact, id: "c2", name: "Secret", isPublic: false }], { lost: false });
    expect(v.contacts.map((c) => c.name)).toEqual(["Rahim"]);
  });
  it("drops the account name fallback string entirely, not just the value", () => {
    const v = buildPublicProfileView(base, [], { lost: false });
    expect(Object.keys(v)).not.toContain("userId");
  });
  ```
- [ ] **Step 2:** `npm test` FAIL.
- [ ] **Step 3:** Implement `buildPublicProfileView` — build the object key-by-key, each guarded by its flag; `displayName = namePublic ? (profile.displayName ?? "Someone's belongings") : "Someone's belongings"`; `photoUrl = photoPublic && profile.photoAssetId ? \`/media/${profile.photoAssetId}\` : null`; `contacts = contactsPublic ? contacts.filter(c => c.isPublic).sort(bySortOrder).map(pick4) : []`. Do **not** spread the profile.
- [ ] **Step 4:** `npm test` PASS; `npx tsc --noEmit && npm run lint`.
- [ ] **Step 5:** Commit: `feat(lib): public-profile privacy DTO with leak tests`

### Task 2.5: `order.ts` + `cart.ts`

**Files:** Create `src/lib/order.ts`, `src/lib/cart.ts`, `src/lib/__tests__/order.test.ts`

**Interfaces:**
- Produces:
  - `generateOrderNumber(): string` → `/^JJ-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/` (uppercase short-code alphabet, no lowercase).
  - `async allocateTags(tx, args: { productId: string; orderItemId: string; quantity: number }): Promise<string[]>` — selects `quantity` `UNASSIGNED` tag ids for `productId` with `orderItemId IS NULL` using `SELECT ... FOR UPDATE SKIP LOCKED`, updates them to `{ orderItemId, status: "ALLOCATED" }`, returns the ids. Throws `Error("OUT_OF_STOCK")` if fewer than `quantity` are available.
  - `parseCheckoutParams(params: URLSearchParams | Record<string,string|undefined>): { productSlug: string; quantity: number } | null` — `quantity` clamped to 1–10, default 1; `null` if no `product`.

- [ ] **Step 1:** `order.test.ts`:
  ```ts
  import { describe, it, expect, vi } from "vitest";
  import { generateOrderNumber } from "../order";
  import { parseCheckoutParams } from "../cart";

  describe("generateOrderNumber", () => {
    it("has the JJ- prefix and 6 unambiguous chars", () => {
      for (let i = 0; i < 50; i++) expect(generateOrderNumber()).toMatch(/^JJ-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/);
    });
    it("is practically unique across a batch", () => {
      const seen = new Set(Array.from({ length: 500 }, () => generateOrderNumber()));
      expect(seen.size).toBeGreaterThan(495);
    });
  });
  describe("parseCheckoutParams", () => {
    it("defaults quantity to 1", () => expect(parseCheckoutParams({ product: "bike-sticker" })).toEqual({ productSlug: "bike-sticker", quantity: 1 }));
    it("clamps quantity to 1..10", () => {
      expect(parseCheckoutParams({ product: "x", qty: "0" })?.quantity).toBe(1);
      expect(parseCheckoutParams({ product: "x", qty: "99" })?.quantity).toBe(10);
      expect(parseCheckoutParams({ product: "x", qty: "3" })?.quantity).toBe(3);
    });
    it("returns null with no product", () => expect(parseCheckoutParams({})).toBeNull());
  });
  ```
  (Note: `allocateTags` is exercised by an integration check in the manual smoke list, not unit-tested here — it needs a live tx. Keep the function small and obviously correct.)
- [ ] **Step 2:** `npm test` FAIL.
- [ ] **Step 3:** Implement `order.ts`:
  ```ts
  import { customAlphabet } from "nanoid";
  import type { Prisma } from "@prisma/client";
  const nano = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);
  export function generateOrderNumber(): string { return `JJ-${nano()}`; }

  export async function allocateTags(
    tx: Prisma.TransactionClient,
    { productId, orderItemId, quantity }: { productId: string; orderItemId: string; quantity: number },
  ): Promise<string[]> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Tag"
      WHERE "productId" = ${productId} AND "status" = 'UNASSIGNED'::"TagStatus" AND "orderItemId" IS NULL
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${quantity}`;
    if (rows.length < quantity) throw new Error("OUT_OF_STOCK");
    const ids = rows.map((r) => r.id);
    const updated = await tx.tag.updateMany({ where: { id: { in: ids } }, data: { orderItemId, status: "ALLOCATED" } });
    if (updated.count !== quantity) throw new Error("OUT_OF_STOCK");
    return ids;
  }
  ```
- [ ] **Step 4:** Implement `cart.ts` `parseCheckoutParams` (accept both `URLSearchParams` and a plain object; read `product` + `qty`).
- [ ] **Step 5:** `npm test` PASS; `npx tsc --noEmit && npm run lint`.
- [ ] **Step 6:** Commit: `feat(lib): order number + tag allocation + checkout param parsing`

### Task 2.6: `media.ts` + `premium.ts`

**Files:** Create `src/lib/media.ts`, `src/lib/premium.ts`

**Interfaces:**
- Produces:
  - `type ProcessedImage = { data: Buffer; mimeType: "image/webp"; width: number; height: number; byteSize: number; checksum: string }`.
  - `async processImage(input: Buffer, kind: "PROFILE_PHOTO" | "PRODUCT_IMAGE"): Promise<ProcessedImage>` — reject if `input.length > 5*1024*1024`; reject if `sharp` cannot read it; resize longest edge to 512 (profile) / 1024 (product), `withoutEnlargement`, strip metadata, `.webp({ quality: 80 })`; `checksum` = sha256 hex of the output.
  - `async renderSvgToWebp(svg: string, size: number): Promise<ProcessedImage>` — rasterise an SVG string to a `size`×`size` webp (for seed placeholders).
  - `isPremiumEnabled(): boolean`.

- [ ] **Step 1:** Implement `media.ts` using `sharp` and `node:crypto`. No unit test (needs binary fixtures + native lib); covered by the seed run and manual upload check.
- [ ] **Step 2:** Implement `premium.ts`: `export const isPremiumEnabled = () => process.env.PREMIUM_ENABLED === "1";`
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 4:** Commit: `feat(lib): image processing + premium flag`

---

# PHASE 3 — Emergency profile, privacy, media serving

Adds `/dashboard/profile`, `/dashboard/privacy`, `/media/[id]`, the shared `PublicProfileCard`, and the new dashboard nav. Scan page still on old code until Phase 4.

### Task 3.1: `GET /media/[id]` route

**Files:** Create `src/app/media/[id]/route.ts`

**Interfaces:**
- Consumes: `MediaAsset` (`prisma`).
- Produces: `GET` returning image bytes with `Content-Type`, `Cache-Control: public, max-age=31536000, immutable`, `ETag: "<checksum>"`; `304` on matching `If-None-Match`; `404` if not found.

- [ ] **Step 1:** Implement:
  ```ts
  import { NextResponse } from "next/server";
  import { prisma } from "@/lib/prisma";
  export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const etag = `"${asset.checksum}"`;
    if (req.headers.get("if-none-match") === etag) return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    return new NextResponse(new Uint8Array(asset.data), {
      headers: { "Content-Type": asset.mimeType, "Cache-Control": "public, max-age=31536000, immutable", ETag: etag },
    });
  }
  ```
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 3:** Commit: `feat(media): cached image-serving route`

### Task 3.2: Validation schemas for profile/privacy/contacts

**Files:** Modify `src/lib/validations.ts`

**Interfaces:**
- Produces: `emergencyProfileSchema` (`displayName` ≤100 optnull, `emergencyMessage` ≤500 optnull, `bloodGroup` enum `["","A+","A-","B+","B-","AB+","AB-","O+","O-"]` optnull, `allergies`/`medicalNotes` ≤500 optnull, `contactMode` enum `["RELAY","DIRECT_CALL"]`, `phonePublic` ≤20 optnull — required when `contactMode==="DIRECT_CALL"` via `.superRefine`), `emergencyContactSchema` (`name` 1..80, `relation` ≤40 optnull, `phone` ≤20 optnull, `email` email optnull, `isPublic` boolean), `privacyFieldSchema` (`field` enum of the 8 flag names, `value` boolean), `privacyPresetSchema` (`preset` enum `["MINIMAL","STANDARD","FULL"]`).
- Remove: `itemSchema`. Remove `planSlug` from `signupSchema`. Trim `tagCustomerUpdateSchema` to `{ internalLabel?: string|null (≤100), status?: enum ["ACTIVE","LOST","DEACTIVATED"] }`. Rename `abuseReportSchema.tagId` → `shortCode`.

- [ ] **Step 1:** Apply the edits. For the `abuseReportSchema` rename, also update `src/app/api/abuse-reports/route.ts` (reads `parsed.data.tagId` → `parsed.data.shortCode`) and `src/app/t/[shortCode]/report-abuse-link.tsx` (POST body `{ tagId: shortCode }` → `{ shortCode }`).
- [ ] **Step 2:** `npx tsc --noEmit` — **expect failures** in `src/app/dashboard/items/*`, `src/app/signup/*`, `src/app/dashboard/tags/[id]/*`. That's expected; those are fixed/removed in later tasks. To keep this task green, do the minimal companion edits now:
  - `src/app/signup/actions.ts` + `signup-form.tsx` + `signup/page.tsx`: drop plan handling (Task 5.6 refines copy; here just make it compile — create the user with no subscription, redirect `/dashboard`).
  - `src/app/dashboard/tags/[id]/actions.ts` + `tag-settings-form.tsx` + `tags/[id]/page.tsx`: reduce to `internalLabel` + `status` (Task 7.1 refines; here make it compile).
  - Delete `src/app/dashboard/items/` entirely and remove the "My Items" link from `src/app/dashboard/layout.tsx` and the `/dashboard/items` references in `src/app/dashboard/page.tsx` (Task 7.3 refines the overview; here just unbreak it).
  - Remove `Item` from `src/app/admin/users/page.tsx` `_count`.
- [ ] **Step 3:** `npm test && npx tsc --noEmit && npm run lint`. Expected: pass.
- [ ] **Step 4:** Commit: `refactor: retire Item + plan-gated signup at the type level; add profile/privacy schemas`

### Task 3.3: `PublicProfileCard` component

**Files:** Create `src/components/public-profile-card.tsx`

**Interfaces:**
- Consumes: `PublicProfileView` from `src/lib/public-profile.ts`.
- Produces: `export function PublicProfileCard({ view, shortCode }: { view: PublicProfileView; shortCode: string })` — pure presentational, no data fetching. Renders (in order): LOST banner if `view.lost`; photo `<img src={view.photoUrl}>` if `view.photoUrl`; `<h1>{view.displayName}</h1>`; "Emergency information" heading; `view.emergencyMessage`; medical rows for each non-null of `bloodGroup`/`allergies`/`medicalNotes`; primary action — if `contactMode === "DIRECT_CALL" && view.phonePublic` a `tel:` button, else `<RelayForm shortCode={shortCode} />` (import the existing component from `src/app/t/[shortCode]/relay-form.tsx`); public contacts list.

- [ ] **Step 1:** Implement. Keep markup close to the existing scan page's `ScanLayout` inner styling so Phase 4 is a drop-in.
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 3:** Commit: `feat(ui): PublicProfileCard (shared by scan page + privacy preview)`

### Task 3.4: `/dashboard/profile` — read + save core fields

**Files:** Create `src/app/dashboard/profile/page.tsx`, `src/app/dashboard/profile/actions.ts`, `src/app/dashboard/profile/profile-form.tsx`. Modify `src/app/dashboard/layout.tsx` (nav).

**Interfaces:**
- Consumes: `requireCustomer`, `emergencyProfileSchema`.
- Produces: `updateEmergencyProfileAction(_prev, formData): Promise<{ error?: string; success?: boolean }>` — `requireCustomer`; `prisma.emergencyProfile.upsert({ where: { userId }, create/update })` with parsed fields; `revalidatePath` for `/dashboard/profile`, `/dashboard/privacy`, `/dashboard`.

- [ ] **Step 1:** `layout.tsx`: replace `links` with `[{/dashboard,Overview},{/dashboard/profile,My Profile},{/dashboard/privacy,Privacy},{/dashboard/tags,My Tags},{/dashboard/orders,Orders},{/dashboard/messages,Messages},{/dashboard/settings,Settings}]` plus, when `isPremiumEnabled()`, `{/dashboard/subscription,Subscription}`.
- [ ] **Step 2:** `page.tsx` (server): `const user = await getCustomer(); if (!user) redirect("/login");` then upsert-load the profile (`prisma.emergencyProfile.upsert({ where:{userId:user.id}, update:{}, create:{ userId:user.id, ...PRESET_FLAGS.STANDARD, visibilityPreset:"STANDARD" } })`) with `contacts`. Render photo block (Task 3.6), `<ProfileForm profile={...} />`, and a link to `/dashboard/privacy`.
- [ ] **Step 3:** `profile-form.tsx` (`"use client"`, `useActionState`): fields per spec §8.4 Identity/Message/Medical/Contact-mode. `phonePublic` input shown always but labelled "shown publicly on your scan page"; when `contactMode==="DIRECT_CALL"` mark it required client-side too.
- [ ] **Step 4:** `actions.ts`: implement `updateEmergencyProfileAction` per Interfaces.
- [ ] **Step 5:** `npx tsc --noEmit && npm run lint && npm test`.
- [ ] **Step 6:** Commit: `feat(dashboard): emergency profile editor + new dashboard nav`

### Task 3.5: Emergency contacts CRUD

**Files:** Modify `src/app/dashboard/profile/actions.ts`; create `src/app/dashboard/profile/contacts-editor.tsx`; use in `page.tsx`.

**Interfaces:**
- Produces: `addContactAction(_prev, formData)`, `updateContactAction(contactId, _prev, formData)`, `deleteContactAction(contactId)`, `reorderContactsAction(orderedIds: string[])`. Each: `requireCustomer`; resolve the caller's `emergencyProfile.id`; for update/delete/reorder verify every target `contact.profileId === profile.id`; `add` refuses when the profile already has 5 contacts.

- [ ] **Step 1:** Implement the four actions with ownership checks (`prisma.emergencyContact.findFirst({ where: { id, profile: { userId } } })`).
- [ ] **Step 2:** `contacts-editor.tsx` (`"use client"`): list existing contacts with inline edit + remove + up/down reorder buttons; an "Add contact" sub-form (max 5, hide the form at the cap).
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint && npm test`.
- [ ] **Step 4:** Commit: `feat(dashboard): emergency contacts editor`

### Task 3.6: Profile photo upload/remove

**Files:** Modify `src/app/dashboard/profile/actions.ts`; create `src/app/dashboard/profile/photo-controls.tsx`; use in `page.tsx`.

**Interfaces:**
- Consumes: `processImage` from `src/lib/media.ts`.
- Produces: `uploadProfilePhotoAction(_prev, formData)` — `requireCustomer`; read `formData.get("photo") as File`; `Buffer.from(await file.arrayBuffer())`; `processImage(buf, "PROFILE_PHOTO")`; `prisma.mediaAsset.create({ data: { ownerId: userId, kind: "PROFILE_PHOTO", ...processed } })`; set `emergencyProfile.photoAssetId`; after commit, best-effort delete the previous asset row. `deleteProfilePhotoAction()` — null the FK, delete the row. Both `revalidatePath("/dashboard/profile")`, `/dashboard/privacy`.

- [ ] **Step 1:** Implement both actions. Guard `file.size` and `file.type` before processing; return `{ error }` strings on reject.
- [ ] **Step 2:** `photo-controls.tsx` (`"use client"`): shows current photo (`<img src={/media/${id}}>`) or `<MascotShield/>` placeholder; file input + "Upload"/"Replace" + "Remove".
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 4:** Commit: `feat(dashboard): profile photo upload backed by MediaAsset`

### Task 3.7: `/dashboard/privacy`

**Files:** Create `src/app/dashboard/privacy/page.tsx`, `src/app/dashboard/privacy/actions.ts`, `src/app/dashboard/privacy/privacy-controls.tsx`.

**Interfaces:**
- Consumes: `applyPreset`, `detectPreset` from `src/lib/privacy.ts`; `buildPublicProfileView`; `PublicProfileCard`.
- Produces: `updatePrivacyAction(input: { preset: "MINIMAL"|"STANDARD"|"FULL" } | { field: FlagName; value: boolean })` — `requireCustomer`; on `preset` → write `applyPreset(preset)` + `visibilityPreset: preset`; on `field` → write that one boolean, then recompute `visibilityPreset = detectPreset(nextFlags)`; `revalidatePath("/dashboard/privacy")`, `/dashboard`, `/t/*` not needed (dynamic).

- [ ] **Step 1:** `actions.ts` per Interfaces (parse with `privacyPresetSchema` / `privacyFieldSchema`).
- [ ] **Step 2:** `page.tsx` (server): load profile + contacts; compute `view = buildPublicProfileView(profile, contacts, { lost: false })`; render preset buttons, the 8-row toggle table (current values), and `<PublicProfileCard view={view} shortCode="preview" />` in a "what finders see" panel.
- [ ] **Step 3:** `privacy-controls.tsx` (`"use client"`): preset buttons + toggles calling `updatePrivacyAction` via `useTransition` + `router.refresh()`.
- [ ] **Step 4:** `npx tsc --noEmit && npm run lint && npm test`.
- [ ] **Step 5:** Commit: `feat(dashboard): privacy controls with live scan preview`

---

# PHASE 4 — Scan page rewrite

### Task 4.1: `/t/[shortCode]` on the DTO

**Files:** Modify `src/app/t/[shortCode]/page.tsx`. Keep `relay-form.tsx`, `report-abuse-link.tsx`.

**Interfaces:**
- Consumes: `buildPublicProfileView`, `PublicProfileCard`.

- [ ] **Step 1:** Rewrite the loader: `prisma.tag.findUnique({ where: { shortCode }, include: { user: { include: { emergencyProfile: { include: { contacts: { orderBy: { sortOrder: "asc" } } } } } } } })`.
- [ ] **Step 2:** `notFound()` if `!tag || tag.status === "DEACTIVATED"`. Keep the existing hashed-IP `ScanEvent` logging + rate limit unchanged.
- [ ] **Step 3:** If `tag.status === "UNASSIGNED" || tag.status === "ALLOCATED" || !tag.user?.emergencyProfile` → render the "not set up yet" card (subtle `<MascotSearch/>`).
- [ ] **Step 4:** Else `const view = buildPublicProfileView(tag.user.emergencyProfile, tag.user.emergencyProfile.contacts, { lost: tag.status === "LOST" });` and render `<ScanLayout><PublicProfileCard view={view} shortCode={shortCode} /></ScanLayout>`.
- [ ] **Step 5:** Grep for `publicDisplayName`, `publicMessage`, `maskedPhone`, `tag.item`, `contactMode` across `src/app` — **zero** results outside migration files and the (now-updated) admin views that still show them. (Admin tag views: replace `tag.item?.label` with `tag.internalLabel ?? tag.product?.name ?? "—"`.)
- [ ] **Step 6:** `npx tsc --noEmit && npm run lint && npm test`. Manual: visit a live tag's `/t/<code>` with STANDARD vs MINIMAL privacy and confirm fields appear/disappear; confirm the owner's real name never shows under MINIMAL.
- [ ] **Step 7:** Commit: `feat(scan): rebuild the public page on the privacy DTO`

---

# PHASE 5 — Storefront, checkout, claim

### Task 5.1: `formatPrice` cleanup + `<GetYourTagButton>`

**Files:** Create `src/components/get-your-tag-button.tsx`. Modify `src/app/page.tsx`, `src/components/site-nav.tsx`.

**Interfaces:**
- Produces: `async function GetYourTagButton({ productSlug, className, children }: { productSlug?: string; className?: string; children?: React.ReactNode })` — `const s = await auth();` → target `productSlug ? \`/checkout?product=${productSlug}\` : "/shop"`; href = `s?.user ? target : \`/signup?next=${encodeURIComponent(target)}\``; admins → `/admin` (they don't shop).

- [ ] **Step 1:** Implement the component.
- [ ] **Step 2:** Replace the hard-coded `/signup` CTAs in `page.tsx` (hero) and `site-nav.tsx` ("Get a tag") with `<GetYourTagButton>`. Update `page.tsx` step 1 copy ("Subscribe and we generate…" → "Pick a sticker for your bike, bag, helmet or car and we ship you a unique QR tag.").
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 4:** Commit: `feat: auth-aware "Get your tag" CTA`

### Task 5.2: Seed products + placeholder images

**Files:** Modify `prisma/seed.ts`. Create `prisma/seed-assets/` with 4 tiny SVG strings inline (no binary files).

- [ ] **Step 1:** In `seed.ts`, after the admin block, define 4 products (`bike-sticker` 29900, `car-sticker` 34900, `luggage-sticker` 24900, `helmet-sticker` 29900) with `tagline`/`description`/`useCase` copy and `sortOrder` 1–4, `status: "ACTIVE"`. For each: if it has no `imageAssetId`, `renderSvgToWebp(<inline SVG>, 640)` → `prisma.mediaAsset.create({ kind: "PRODUCT_IMAGE", ownerId: null, ... })` → set `imageAssetId`. Upsert by `slug`.
- [ ] **Step 2:** `npm run db:seed`. Expected: "Seed complete", 4 products present, each with an `imageAssetId`.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 4:** Commit: `feat(seed): four physical sticker products with placeholder images`

### Task 5.3: `/shop` + `/shop/[slug]`

**Files:** Create `src/app/shop/page.tsx`, `src/app/shop/[slug]/page.tsx`.

- [ ] **Step 1:** `/shop` (server): `prisma.product.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } })`. Grid of cards: `<img src={/media/${p.imageAssetId}}>`, name, tagline, `<Price cents={p.priceCents} currency={p.currency} />` + "one-time" tag, `<GetYourTagButton productSlug={p.slug}>Get yours</GetYourTagButton>`. Empty → `<EmptyTags/>` + "Products coming soon". Include `<SiteNav/>` + `<SiteFooter/>` like `pricing/page.tsx` did.
- [ ] **Step 2:** `/shop/[slug]` (server): `findUnique`; `notFound()` unless `status === "ACTIVE"`. Show image, name, tagline, description, useCase, price + "One-time purchase — no subscription" badge, `<GetYourTagButton productSlug={slug}>`.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`. Manual: `/shop` lists 4, `/shop/bike-sticker` renders.
- [ ] **Step 4:** Commit: `feat(shop): product storefront`

### Task 5.4: `/pricing` → `/shop` redirect

**Files:** Modify `next.config.ts`. Delete `src/app/pricing/page.tsx`.

- [ ] **Step 1:** `next.config.ts`:
  ```ts
  const nextConfig: NextConfig = {
    output: "standalone",
    async redirects() { return [{ source: "/pricing", destination: "/shop", permanent: true }]; },
  };
  ```
- [ ] **Step 2:** Delete `src/app/pricing/`. Grep for `/pricing` links → update to `/shop` (`site-nav.tsx` "Pricing" link → "Shop" → `/shop`).
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`. Manual: `curl -sI localhost:3000/pricing` → 308/301 to `/shop`.
- [ ] **Step 4:** Commit: `feat: replace /pricing with a 301 to /shop`

### Task 5.5: `/checkout` + `createOrderAction`

**Files:** Create `src/app/checkout/page.tsx`, `src/app/checkout/actions.ts`, `src/app/checkout/checkout-form.tsx`, `src/app/checkout/success/page.tsx`. Modify `src/proxy.ts`.

**Interfaces:**
- Consumes: `parseCheckoutParams`, `generateOrderNumber`, `allocateTags`, `requireCustomer`, `checkoutSchema`.
- Produces: `createOrderAction(_prev, formData): Promise<{ error?: string }>` (redirects on success). Transaction per spec §8.2 step 3: create `Order` PENDING + one `OrderItem` (price snapshot) → `allocateTags` → `Payment` `{ kind:"ORDER", provider:"DEMO", status:"SUCCEEDED", providerRef: \`demo_${Date.now()}\` }` → `Order.status="PAID", placedAt: new Date()` → `tag.updateMany({ where: { id: { in: ids } }, data: { userId, status: "ACTIVE" } })`. On `OUT_OF_STOCK` → `{ error: "Sorry, that product just sold out. We're restocking — please check back." }` and `console.warn` with product slug + shortfall. Redirect `/checkout/success?order=<orderNumber>`.

- [ ] **Step 1:** `proxy.ts`: matcher → `["/dashboard/:path*", "/admin/:path*", "/checkout/:path*", "/claim/:path*"]`; add branches: unauth on `/checkout`|`/claim` → `/login?next=<pathname+search>`; `role === "ADMIN"` on those → `/admin`.
- [ ] **Step 2:** `checkoutSchema` in `validations.ts`: `{ productSlug: string, quantity: 1..10, shipName?/shipPhone?/shipAddress?/shipCity?/shipNote? — all ≤200 optnull }`.
- [ ] **Step 3:** `page.tsx` (server): `const parsed = parseCheckoutParams(await searchParams); if (!parsed) redirect("/shop");` load `ACTIVE` product or `redirect("/shop")`; render line summary + `<CheckoutForm product={...} quantity={parsed.quantity} />`.
- [ ] **Step 4:** `checkout-form.tsx` (`"use client"`, `useActionState`): qty stepper (1–10), optional shipping fields, "Pay (demo)" button, demo-mode notice.
- [ ] **Step 5:** `actions.ts`: implement `createOrderAction` per Interfaces. Wrap the multi-step body in `prisma.$transaction(async (tx) => {...})`. `redirect()` **after** the transaction resolves.
- [ ] **Step 6:** `success/page.tsx` (server): load `prisma.order.findFirst({ where: { orderNumber, userId }, include: { items: { include: { product: true, tags: true } } } })`; `notFound()` if missing; list each tag: `/t/<shortCode>` + `claimCode` + CTA to `/dashboard/profile`; `<MascotCheer/>`; if the user has no `emergencyProfile`, a prominent "add your emergency info" banner.
- [ ] **Step 7:** `npx tsc --noEmit && npm run lint && npm test`. Manual: log in → `/checkout?product=bike-sticker&qty=2` → pay → success shows 2 tags with codes → `/dashboard/tags` shows 2 ACTIVE tags → `/t/<code>` works ("not set up yet" until profile saved).
- [ ] **Step 8:** Commit: `feat(checkout): one-time purchase, order creation, tag allocation`

### Task 5.6: `/claim` + `/claim/[code]` + `claimTagAction`

**Files:** Create `src/app/claim/page.tsx`, `src/app/claim/[code]/page.tsx`, `src/app/claim/actions.ts`.

**Interfaces:**
- Consumes: `normalizeClaimCode`, `requireCustomer`, `rateLimit`, `getClientIp`, `claimSchema` (`{ code: string }`).
- Produces: `claimTagAction(_prev, formData): Promise<{ error?: string }>` (redirects on success) — `requireCustomer`; `rateLimit(\`claim:${user.id}\`, {limit:10,windowMs:600000})` and `rateLimit(\`claim-code:${normalized}\`, {limit:5,windowMs:600000})`; `prisma.tag.updateMany({ where: { claimCode: normalized, userId: null, status: { not: "DEACTIVATED" } }, data: { userId: user.id, status: "ACTIVE" } })`; if `count !== 1` → `{ error: "That code isn't valid or has already been used." }`; else look up the tag id and `redirect(\`/dashboard/tags/${id}\`)`.

- [ ] **Step 1:** `/claim/page.tsx` (server, auth via `getCustomer`): a form (GET) that submits `code` to `/claim/[code]` — or a client input that `router.push`es. Keep it a plain form posting to a route param.
- [ ] **Step 2:** `/claim/[code]/page.tsx` (server): `const code = normalizeClaimCode(decodeURIComponent(params.code));` load `prisma.tag.findUnique({ where: { claimCode: code }, include: { product: true } })`; if not found / `userId` set / `DEACTIVATED` → render generic "not valid or already used" (no product details). Else show product + a confirm `<form action={claimTagAction}>` with a hidden `code`.
- [ ] **Step 3:** `actions.ts`: implement `claimTagAction`.
- [ ] **Step 4:** `npx tsc --noEmit && npm run lint && npm test`. Manual: take a `claimCode` from checkout success of user A; as user B `/claim` it → success; retry → generic error.
- [ ] **Step 5:** Commit: `feat(claim): attach a tag to an account by its printed code`

### Task 5.7: Finalise signup/login `?next=`

**Files:** Modify `src/app/signup/actions.ts`, `src/app/signup/page.tsx`, `src/app/signup/signup-form.tsx`, `src/app/login/actions.ts`, `src/app/login/login-form.tsx`.

- [ ] **Step 1:** `signupSchema` already lost `planSlug` (Task 3.2). `signup-form.tsx`: remove the plan `<select>`; add a hidden `next` input populated from the page's `searchParams.next` when `isSafeNext`. `signup/page.tsx`: drop the plan query, pass `next` through.
- [ ] **Step 2:** `signupAction`: after `signIn`, `redirect(isSafeNext(next) ? next : "/dashboard")`.
- [ ] **Step 3:** `loginAction` + `login-form.tsx`: same `next` handling; admins still go to `/admin`.
- [ ] **Step 4:** `npx tsc --noEmit && npm run lint && npm test`. Manual: logged-out → `/shop/bike-sticker` → "Get yours" → lands on `/signup?next=%2Fcheckout%3Fproduct%3Dbike-sticker` → after signup lands on `/checkout?product=bike-sticker`.
- [ ] **Step 5:** Commit: `feat(auth): plan-free signup with safe ?next= redirect`

---

# PHASE 6 — Admin store

### Task 6.1: Admin nav + overview tiles

**Files:** Modify `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`.

- [ ] **Step 1:** `layout.tsx`: add a `Store` section above `Tag management`: `[{/admin/products,Products},{/admin/orders,Orders}]`.
- [ ] **Step 2:** `page.tsx`: add a `Store` group of tiles — active products (`product.count({where:{status:"ACTIVE"}})`), orders last 7d (`order.count({where:{placedAt:{gte: 7d}}})`), revenue (`payment.aggregate({_sum:{amountCents:true}, where:{kind:"ORDER", status:"SUCCEEDED"}})`), tags allocated-not-active (`tag.count({where:{status:"ALLOCATED"}})`).
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 4:** Commit: `feat(admin): store nav section and overview tiles`

### Task 6.2: `/admin/products` list + create + image upload

**Files:** Create `src/app/admin/products/page.tsx`, `src/app/admin/products/[id]/page.tsx`, `src/app/admin/products/actions.ts`, `src/app/admin/products/product-form.tsx`.

**Interfaces:**
- Consumes: `requireAdmin`, `productSchema` (`slug` `/^[a-z0-9-]+$/` 2..40, `name` 2..80, `tagline` 2..140, `description` 2..2000, `useCase?` ≤500, `priceCents` int ≥0, `currency` default BDT, `status` enum, `sortOrder` int), `processImage`.
- Produces: `createProductAction`, `updateProductAction(id, …)`, `archiveProductAction(id)`, `uploadProductImageAction(id, formData)` — all `requireAdmin`; image action mirrors `uploadProfilePhotoAction` but `kind: "PRODUCT_IMAGE"`, `ownerId: null`, sets `product.imageAssetId`.

- [ ] **Step 1:** `actions.ts` — the four actions.
- [ ] **Step 2:** `products/page.tsx` — table (image thumb, name, price via `formatPrice`, status, sortOrder, `tag._count`), plus a "New product" `<ProductForm/>`.
- [ ] **Step 3:** `products/[id]/page.tsx` — `<ProductForm product={...} />` (edit) + image upload control + "Archive" button.
- [ ] **Step 4:** `product-form.tsx` (`"use client"`).
- [ ] **Step 5:** `npx tsc --noEmit && npm run lint`. Manual: create a product, upload an image, see it on `/shop`.
- [ ] **Step 6:** Commit: `feat(admin): product management`

### Task 6.3: `/admin/orders` list + detail + transitions

**Files:** Create `src/app/admin/orders/page.tsx`, `src/app/admin/orders/[id]/page.tsx`, `src/app/admin/orders/actions.ts`, `src/app/admin/orders/order-controls.tsx`.

**Interfaces:**
- Produces: `updateOrderStatusAction(id, status)` (allowed: `PENDING→PAID|CANCELLED`, `PAID→REFUNDED`), `updateFulfillmentAction(id, status)` (linear `UNFULFILLED→PROCESSING→SHIPPED→DELIVERED`, any → back one step), `issueReplacementTagAction(orderItemId)` — `requireAdmin`; allocates 1 `UNASSIGNED` tag of the order item's product via `allocateTags(tx, {quantity:1})`, links it to the same `orderItem` + `order.user`, status `ACTIVE`; used when a tag is lost/damaged.

- [ ] **Step 1:** `actions.ts` with transition-validity guards (reject invalid jumps with a thrown `Error`).
- [ ] **Step 2:** `orders/page.tsx` — table (orderNumber, customer, `formatPrice(totalCents)`, status, fulfillmentStatus, placedAt), filter by `status` via `searchParams`.
- [ ] **Step 3:** `orders/[id]/page.tsx` — line items, allocated tags (shortCode + claimCode + status), `Payment` rows, `<OrderControls/>` for the two status pickers + per-item "issue replacement".
- [ ] **Step 4:** `order-controls.tsx` (`"use client"`).
- [ ] **Step 5:** `npx tsc --noEmit && npm run lint`. Manual: open the order from Task 5.5, move fulfillment PROCESSING→SHIPPED, issue a replacement tag.
- [ ] **Step 6:** Commit: `feat(admin): order management and fulfillment transitions`

### Task 6.4: Tag inventory by product + batch generation + tag detail

**Files:** Modify `src/app/admin/tags/page.tsx`, `src/app/admin/tags/actions.ts`, `src/app/admin/tags/generate-tags-button.tsx` → rename concept to `generate-batch-form.tsx`. Create `src/app/admin/tags/[id]/page.tsx`. Modify `src/app/admin/tags/tag-status-select.tsx` if needed. Modify `src/app/admin/actions.ts` (`assignTagAction` de-gate, `setTagStatusAction` scrub `internalLabel`).

**Interfaces:**
- Produces: `generateTagBatchAction({ quantity: 1..500, productId?: string, label: string })` — `requireAdmin`; create a `TagBatch`; generate codes with `createMany({ data: [...], skipDuplicates: true })` in chunks of 100; on shortfall (duplicates), retry only the missing count up to 3 rounds; each tag gets `shortCode` (`generateShortCode`), `claimCode` (`generateClaimCode`), `status: "UNASSIGNED"`, `productId`, `batchId`. Returns `{ created: number }`.
- Changed: `assignTagAction(userId, tagId)` — drop the subscription + `maxTags` checks; keep role/status/`UNASSIGNED` checks + the guarded `updateMany` → `{ userId, status: "ACTIVE" }`.
- Changed: `setTagStatusAction(tagId, "UNASSIGNED")` branch also nulls `internalLabel`, `orderItemId`.

- [ ] **Step 1:** `admin/tags/actions.ts`: implement `generateTagBatchAction` (replaces `generateTagsAction`). Keep the export name available or update `generate-batch-form.tsx` accordingly.
- [ ] **Step 2:** `admin/actions.ts`: edit `assignTagAction` + `setTagStatusAction` per Interfaces.
- [ ] **Step 3:** `generate-batch-form.tsx` (`"use client"`): quantity + product `<select>` (from a `products` prop) + batch label; calls `generateTagBatchAction`.
- [ ] **Step 4:** `admin/tags/page.tsx`: pass `products` to the form; add a `productId` + `status` filter (`searchParams`); add a "Product" column (`tag.product?.name`); replace any `tag.item?.label` with `tag.internalLabel ?? "—"`.
- [ ] **Step 5:** `admin/tags/[id]/page.tsx` (server): tag detail — status, owner, order link, batch, scan count, message count, buttons: "Return to inventory" (`setTagStatusAction(id,"UNASSIGNED")`), "Mark lost" (`setTagStatusAction(id,"LOST")`).
- [ ] **Step 6:** `admin/tags/issued/page.tsx`: replace `tag.item?.label` with `tag.internalLabel ?? "—"`, add Product column.
- [ ] **Step 7:** `npx tsc --noEmit && npm run lint`. Manual: generate a batch of 20 bike-sticker tags → inventory count rises → checkout consumes them.
- [ ] **Step 8:** Commit: `feat(admin): product-scoped tag batches, de-gated assignment, tag detail`

### Task 6.5: Payments page covers order payments

**Files:** Modify `src/app/admin/payments/page.tsx`.

- [ ] **Step 1:** Widen the query: `include: { subscription: { select: { user, plan } }, order: { select: { orderNumber, user: { select: { name, email } } } } }`. Row rendering branches on `p.kind`: `SUBSCRIPTION` → existing columns; `ORDER` → customer from `p.order.user`, "Product" column = "Order <orderNumber>". "Succeeded total" sums all `SUCCEEDED` regardless of kind, plus a per-kind breakdown line.
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 3:** Commit: `feat(admin): show order payments alongside subscription payments`

---

# PHASE 7 — Dashboard tags/orders/overview + subscription move

### Task 7.1: `/dashboard/tags` + `/dashboard/tags/[id]`

**Files:** Modify `src/app/dashboard/tags/page.tsx`, `src/app/dashboard/tags/[id]/page.tsx`, `src/app/dashboard/tags/[id]/actions.ts`, `src/app/dashboard/tags/[id]/tag-settings-form.tsx`.

**Interfaces:**
- Produces (final form): `updateTagAction(tagId, _prev, formData)` — `requireCustomer` + `where: { id, userId }`; writes only `internalLabel` (≤100, nullable) and `status ∈ {ACTIVE,LOST,DEACTIVATED}` (parsed with the trimmed `tagCustomerUpdateSchema`). `revalidatePath` `/dashboard/tags`, `/dashboard/tags/${id}`.

- [ ] **Step 1:** `tags/page.tsx`: query `prisma.tag.findMany({ where: { userId }, include: { product: true }, orderBy: { createdAt: "desc" } })`. Card: QR thumb (`generateTagQrDataUrl`), `tag.internalLabel ?? tag.product?.name ?? "Tag"`, `/t/<shortCode>`, status badge, `claimCode` (small), link to detail. Empty state → `<EmptyTags/>` + "Buy a sticker" → `/shop` + "Have a code?" → `/claim`. Remove the subscription/entitlement line entirely.
- [ ] **Step 2:** `tags/[id]/page.tsx`: remove the `items` query and the public-page config fields; keep QR + "Download PNG" (`/api/tags/[id]/qr`) + "View public page"; add order link (`tag.orderItem?.orderId` → `/dashboard/orders/<id>`); keep scan history + messages; render the trimmed `<TagSettingsForm>`.
- [ ] **Step 3:** `tag-settings-form.tsx`: two controls — `internalLabel` text + `status` select (ACTIVE/LOST/DEACTIVATED). Drop attached-item, contact-mode, public name/message/phone.
- [ ] **Step 4:** `actions.ts`: final `updateTagAction`.
- [ ] **Step 5:** `npx tsc --noEmit && npm run lint && npm test`.
- [ ] **Step 6:** Commit: `feat(dashboard): tags become physical-tag management (label + status)`

### Task 7.2: `/dashboard/orders` + `[id]`

**Files:** Create `src/app/dashboard/orders/page.tsx`, `src/app/dashboard/orders/[id]/page.tsx`.

- [ ] **Step 1:** `orders/page.tsx` (server, `getCustomer`): `prisma.order.findMany({ where: { userId }, include: { items: { include: { product: true } }, _count: { select: { items: true } } }, orderBy: { createdAt: "desc" } })`. Table: orderNumber, date, status, fulfillmentStatus, item summary. Empty → `<EmptyOrders/>` + "Visit the shop".
- [ ] **Step 2:** `orders/[id]/page.tsx`: `findFirst({ where: { id, userId }, include: { items: { include: { product: true, tags: true } }, payments: true } })`; `notFound()` if missing. Show line items, per-tag `/t/<shortCode>` + `claimCode`, payment status, shipping info.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 4:** Commit: `feat(dashboard): order history`

### Task 7.3: Dashboard overview rework

**Files:** Modify `src/app/dashboard/page.tsx`.

- [ ] **Step 1:** Replace queries: drop `subscription`/plan tag-limit; add `emergencyProfile` (+ `_count` contacts), `tag.groupBy({ by: ["status"], where: { userId }, _count: true })`, recent 5 `scanEvent`, recent 5 `relayMessage`, recent 3 `order`.
- [ ] **Step 2:** Render: a **profile-completeness** card (photo? message? ≥1 contact? contactMode chosen? → n/4 with a link to `/dashboard/profile`), tag counts by status, recent scans (use `tag.internalLabel ?? tag.shortCode`), recent messages, recent orders. Quick links: "My Profile", "Buy a sticker" (`/shop`), "Manage tags". Empty regions → illustrations.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint && npm test`.
- [ ] **Step 4:** Commit: `feat(dashboard): profile-centric overview`

### Task 7.4: `/dashboard/billing` → `/dashboard/subscription` (flag-gated)

**Files:** Rename `src/app/dashboard/billing/` → `src/app/dashboard/subscription/`. Modify its `page.tsx`, keep `plan-picker.tsx` + `actions.ts` (`changePlanAction`).

- [ ] **Step 1:** `git mv` the directory. `subscription/page.tsx`: at top, `if (!isPremiumEnabled()) redirect("/dashboard");`. Reframe copy as "Premium (optional)". Keep the plan picker + payment history working in demo mode.
- [ ] **Step 2:** Grep for `/dashboard/billing` → update (`dashboard/page.tsx` quick links removed it already; check `settings`).
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 4:** Commit: `refactor(dashboard): billing → subscription, hidden behind PREMIUM_ENABLED`

### Task 7.5: Messages page cleanup

**Files:** Modify `src/app/dashboard/messages/page.tsx`.

- [ ] **Step 1:** Replace `m.tag.item?.label ?? m.tag.publicDisplayName ?? \`Tag ${m.tag.shortCode}\`` with `m.tag.internalLabel ?? m.tag.product?.name ?? \`Tag ${m.tag.shortCode}\``; adjust the `include` (`tag: { include: { product: true } }`).
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 3:** Commit: `fix(dashboard): messages reference tag label, not item`

---

# PHASE 8 — Destructive migration M3

Only after Phases 3–7: grep confirms nothing in `src/` reads `Tag.publicDisplayName`, `Tag.publicMessage`, `Tag.maskedPhone`, `Tag.contactMode`, `Tag.itemId`, or the `Item` model.

### Task 8.1: M3 — drop `Item` + old `Tag` columns

**Files:** Modify `prisma/schema.prisma`. Create `prisma/migrations/<timestamp>_drop_item_and_tag_public_fields/migration.sql`. Delete `prisma/` references to `Item` (none besides schema). Modify `src/app/admin/users/page.tsx` (already dropped `items` in Task 3.2 — verify).

- [ ] **Step 1:** Grep `rg -n "publicDisplayName|publicMessage|maskedPhone|\.contactMode|itemId|prisma\.item\.|Item\[\]" src/` → expect **no** hits (migration/spec files excluded). Fix any stragglers before proceeding.
- [ ] **Step 2:** Edit `schema.prisma`: remove from `Tag`: `publicDisplayName`, `publicMessage`, `maskedPhone`, `contactMode`, `itemId`, the `item` relation, `@@index([itemId])`. Remove the `Item` model. Remove `items Item[]` from `User`. Change `enum ContactMode` to `{ RELAY DIRECT_CALL }`.
- [ ] **Step 3:** `npx prisma migrate dev --name drop_item_and_tag_public_fields --create-only`.
- [ ] **Step 4:** Hand-edit `migration.sql` to append the enum recreation (spec §M3):
  ```sql
  CREATE TYPE "ContactMode_new" AS ENUM ('RELAY', 'DIRECT_CALL');
  ALTER TABLE "EmergencyProfile" ALTER COLUMN "contactMode" DROP DEFAULT;
  ALTER TABLE "EmergencyProfile" ALTER COLUMN "contactMode" TYPE "ContactMode_new" USING ("contactMode"::text::"ContactMode_new");
  ALTER TABLE "EmergencyProfile" ALTER COLUMN "contactMode" SET DEFAULT 'RELAY';
  DROP TYPE "ContactMode";
  ALTER TYPE "ContactMode_new" RENAME TO "ContactMode";
  ```
  (Ensure the generated `DROP TABLE "Item"` and `ALTER TABLE "Tag" DROP COLUMN …` statements are present and ordered before the enum block.)
- [ ] **Step 5:** `npx prisma migrate dev` (apply) → `npx prisma generate`.
- [ ] **Step 6:** `npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma --exit-code` → clean.
- [ ] **Step 7:** `npx tsc --noEmit && npm run lint && npm test`. Expected: pass.
- [ ] **Step 8:** Commit: `feat(db): M3 drop Item table and legacy Tag public fields`

---

# PHASE 9 — Visual pass

### Task 9.1: Illustration set

**Files:** Create `src/components/illustrations/index.tsx` (exports `MascotWave`, `MascotSearch`, `MascotCheer`, `MascotThink`, `MascotShield`, `EmptyTags`, `EmptyOrders`, `EmptyMessages`, `EmptyInbox`).

- [ ] **Step 1:** Implement each as a small inline `<svg>` React component: a rounded blob character, 2 palette colours via `currentColor` + `text-emerald-*`/`text-[--color-accent]`, `role="img"` + `aria-label`, `className` passthrough, ≤ ~40 lines each.
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint`.
- [ ] **Step 3:** Commit: `feat(ui): inline-SVG mascot and empty-state illustrations`

### Task 9.2: Palette + motion in `globals.css`; font stack

**Files:** Modify `src/app/globals.css`, `src/app/layout.tsx`.

- [ ] **Step 1:** `globals.css`: add tokens `--color-primary` (emerald `#059669`), `--color-accent` (`#F98A6B`), `--color-surface` (`#FBF9F6`); replace the `body { font-family: Arial… }` rule with `body { background: var(--color-surface); color: var(--foreground); font-family: var(--font-geist-sans), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }`. Add `@media (prefers-reduced-motion: no-preference) { @keyframes float {…} @keyframes wave {…} @keyframes pulse-soft {…} .anim-float{animation:float 6s ease-in-out infinite} … }`.
- [ ] **Step 2:** `layout.tsx`: keep the Geist font wiring; update `metadata.description` to the two-business framing.
- [ ] **Step 3:** `npx tsc --noEmit && npm run lint`. Manual: pages still readable in light view; no layout shift.
- [ ] **Step 4:** Commit: `feat(ui): warmer palette, motion tokens, friendlier font stack`

### Task 9.3: `ui/` primitives + apply illustrations to empty/success states

**Files:** Create `src/components/ui/index.tsx` (`Card`, `Field`, `Toggle`, `Badge`, `Price`, `PageHeader`). Apply illustrations in: `src/app/page.tsx` (hero → `MascotWave`), `src/app/shop/page.tsx` empty, `src/app/checkout/success/page.tsx` (`MascotCheer`), `src/app/claim/[code]/page.tsx` success, `src/app/dashboard/*` empty states, `src/app/not-found.tsx` (create it).

- [ ] **Step 1:** Implement the primitives (thin wrappers over the Tailwind classes already repeated across the codebase). Use `<Price>` = `formatPrice` + "one-time" affordance.
- [ ] **Step 2:** Create `src/app/not-found.tsx` with `<MascotSearch/>` + link home.
- [ ] **Step 3:** Wire the illustrations into the listed empty/success spots (swap bare "No … yet" text for illustration + prompt). Do **not** touch `/t/[shortCode]` beyond the tiny existing wordmark.
- [ ] **Step 4:** `npx tsc --noEmit && npm run lint && npm test`.
- [ ] **Step 5:** Commit: `feat(ui): shared primitives and illustrated empty/success states`

### Task 9.4: README refresh

**Files:** Modify `README.md`.

- [ ] **Step 1:** Rewrite the intro + "Project layout" + "Tag lifecycle" sections for the two-business model: physical store (`/shop`, `/checkout`, `/claim`, orders, product-scoped inventory), SaaS profile (`/dashboard/profile`, `/dashboard/privacy`, scan page on the DTO). Update the model list (`Product`, `Order`, `OrderItem`, `EmergencyProfile`, `EmergencyContact`, `MediaAsset`; `Item` removed). Note `PREMIUM_ENABLED`, `sharp`, `npm test`, `npm run db:backfill`. Keep the privacy/abuse and deployment sections, updating the tag-lifecycle paragraph.
- [ ] **Step 2:** `npm run lint`.
- [ ] **Step 3:** Commit: `docs: rewrite README for the store + profile model`

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| §2 D1 fold Item → drop | 1.3 (backfill `internalLabel`), 8.1 (drop) |
| §2 D2 one profile/account | 3.4 (`@unique userId` upsert) |
| §2 D3 media in Postgres | 2.6 (`media.ts`), 3.1 (serve), 3.6 / 6.2 (write) |
| §2 D4 auto-allocate + claim | 5.5 (allocate), 5.6 (claim) |
| §2 D5 subscription dormant | 3.2 (drop plan from signup), 6.4 (de-gate assign), 7.4 (flag-gate UI) |
| §2 D6 tags → ACTIVE on paid | 5.5 step 5 |
| §2 D7 minimal Vitest | 2.1–2.5 |
| §2 D8 /pricing → /shop | 5.4 |
| §4 data model | 1.2 (M1), 1.4 (M2), 8.1 (M3) |
| §5 migration plan | Phase 1 + Phase 8 |
| §6 routes | Phases 3,5,6,7 |
| §7 auth & guards | 2.1 (`isSafeNext`), 3.x/5.x/6.x/7.x actions, 5.5 step 1 (proxy) |
| §8.1 storefront | 5.3 |
| §8.2 checkout/orders | 5.5 |
| §8.3 claim | 5.6 |
| §8.4 profile | 3.4–3.6 |
| §8.5 privacy | 3.7 |
| §8.6 photo/MediaAsset | 3.1, 3.6 |
| §8.7 scan page | 4.1 |
| §8.8 dashboard IA | 3.4 (nav), 7.1–7.5 |
| §8.9 admin | 6.1–6.5 |
| §8.10 visual system | 9.1–9.3 |
| §9 lib modules | Phase 2 + 2.6 |
| §10 security S1–S6 + new | S1 3.4, S2 4.1, S3 1.2, S4 3.2, S5 9.4, S6 6.4, next= 2.1/5.7, SKIP LOCKED 2.5 |
| §11 tests | 2.1–2.5 |
| §12 gates | Global Constraints + every task's last steps |
| §13 rollout order | Phases 1–9 map 1:1 |

No uncovered spec requirement.

**2. Placeholder scan** — no "TBD"/"handle appropriately"/"similar to Task N". Code steps carry real code or a precise field list. UI-page steps name every query, field, and component. ✅

**3. Type consistency** — `PublicProfileView` (2.4) consumed unchanged by 3.3, 3.7, 4.1. `allocateTags(tx, {productId, orderItemId, quantity})` (2.5) called with those exact keys in 5.5, 6.3. `VisibilityFlags` field names (2.3) === `EmergencyProfile` boolean columns (§4.9) === `privacyFieldSchema` enum (3.2). `generateClaimCode`/`normalizeClaimCode` (2.2) used in 1.3 (inlined copy, noted), 5.6, 6.4. `formatPrice(cents, currency)` (2.1) used in 5.3, 6.2, 6.3, 7.x. `isPremiumEnabled()` (2.6) used in 3.4, 7.4. ✅

Fix applied during review: Task 3.2 pulls the *minimal* Item/signup/tags companion edits earlier than their "home" phase so each task stays green — noted explicitly in 3.2 step 2 and cross-referenced from 5.7 / 7.1.
