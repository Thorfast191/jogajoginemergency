# Super admin, themed stickers, SaaS management and site polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split admin into SUPER_ADMIN/ADMIN, composite each customer's QR into the centre of their theme's artwork for print, give the console real subscription/settings/monitoring tools, and fill out the public site and dashboards.

**Architecture:** Pure rule modules in `src/lib` (permissions, guards, sticker layout, print readiness, subscription periods, pagination, day bucketing, gateway filtering) carry the decisions and the tests; server modules wrap Prisma and `sharp`; pages and server actions call `requirePermission` / `getStaffWith`. Stickers render on demand from route handlers; nothing composited is stored.

**Tech Stack:** Next.js 16.3 App Router (proxy in `src/proxy.ts`, `after()` from `next/server`), React 19, Prisma 6 + PostgreSQL, Auth.js v5 JWT, Tailwind v4, `sharp` 0.35, `qrcode`, new `pdf-lib` (runtime) and `jsqr` (dev), Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-15-roles-stickers-saas-site-design.md`

## Global Constraints

- Subscription gates the whole scan page; `LAPSED_BEHAVIOUR` stays `RELAY_ONLY`.
- Super admin only: `money.manage`, `pricing.manage`, `destructive`, `admins.manage`, `settings.manage`.
- QR in stickers is black (`#000000`) on white (`#FFFFFF`), error correction `Q`, always centred.
- `Theme.qrBoxSize` range 20–80, default 40. `Product.stickerWidthMm` range 20–300, default 60. `SubscriptionPlan.intervalMonths` ∈ {1, 6, 12}, default 12.
- No animation library. Every motion class lives under `@media (prefers-reduced-motion: no-preference)`.
- Server actions authorize server-side regardless of what the UI rendered.
- Sticker and QR responses for real tags: `Cache-Control: private, no-store`.
- Match existing style: comments explain *why*, Tailwind utility classes, brand tokens (`--color-primary` etc.), no emerald hard-codes in new code.
- Every phase ends with `npm test`, `npx tsc --noEmit`, `npx eslint src` clean, then a commit.

## File map

| File | Responsibility |
|---|---|
| `src/lib/permissions.ts` (new) | Role → permission table, `can`, `isStaff`, `roleLabel` |
| `src/lib/admin-guards.ts` | `canChangeRole`, `canSetUserStatus` |
| `src/lib/token-freshness.ts` | adds `latest()` |
| `src/lib/session.ts` | `getAdmin` (any staff), `getStaffWith`, `requirePermission` |
| `src/lib/audit.ts` (new) | `audit()` writes `AdminAuditLog` |
| `src/lib/sticker-layout.ts` (new) | pure `qrBox`, `clampBoxSize`, `mmToPt` |
| `src/lib/sticker.ts` (new) | `defaultArtworkSvg`, `renderSticker`, `stickerPdf` |
| `src/lib/sticker-server.ts` (new) | load tag/theme/art from DB, `stickerForTag`, `themePreview` |
| `src/lib/print.ts` (new) | pure `printReadiness` |
| `src/lib/subscription-periods.ts` (new) | pure `addMonths`, `extendPeriod`, `daysLeft`, `subscriptionBucket` |
| `src/lib/subscription.ts` | adds `entitledWhere(now)`, `bucketWhere(bucket, now)` |
| `src/lib/settings.ts` (new) | `getSettings`, defaults |
| `src/lib/payments/enabled.ts` (new) | pure `enabledProviderIds`; async `enabledGateways`, `enabledGatewayFor` |
| `src/lib/maintenance.ts` (new) | `runMaintenance()` shared by route and settings page |
| `src/lib/pagination.ts` (new) | pure `pageParams`, `pageCount` |
| `src/lib/daily.ts` (new) | pure `fillDays`; server `dailyScanCounts` |
| `src/components/admin/*` (new) | `Forbidden`, `AdminNav`, `Pagination`, `BarChart` |
| `src/components/reveal.tsx`, `nav-link.tsx`, `mobile-menu.tsx`, `icons.tsx`, `scan-layout.tsx`, `demo-phone.tsx` (new) | shared UI |

---

## Phase 1 — Cleanup

### Task 1: Remove leftovers and stale copy

**Files:** Modify `src/app/dashboard/tags/actions.ts`, `src/app/admin/page.tsx`, `src/app/dashboard/subscription/page.tsx`, `src/app/admin/subscriptions/page.tsx`, `src/app/dashboard/orders/[id]/page.tsx`, `src/lib/validations.ts`, `src/proxy.ts`, `src/app/admin/scans/page.tsx`, `src/app/admin/themes/page.tsx`, `src/app/themes/page.tsx`, `src/app/t/[shortCode]/page.tsx`, `vitest.config.mts`.

- [ ] Delete the trailing ` `` ` line from `dashboard/tags/actions.ts`.
- [ ] Overview: change the "Tag inventory" tile to "QR codes generated" linking `/admin/tags`.
- [ ] Subscription page `INCLUDED[2]` → `["Portfolio and scan history", "A short bio, your links, and the full scan history of every tag."]`.
- [ ] Admin subscriptions: drop the DEMO sentence.
- [ ] Dashboard order detail: replace the empty `claim` span with the tag status.
- [ ] `validations.ts`: delete `claimSchema`, `tagBatchSchema`, and the UNASSIGNED/ALLOCATED comment.
- [ ] `proxy.ts`: drop `/claim` from the customer area and matcher.
- [ ] Scans page: remove the "Unassigned" branch (a tag always has an owner).
- [ ] Remove the empty spacer `<div>`s left in both themes pages.
- [ ] Scan page: move `scanEvent.create` and `notifyOwnerOfScan` into `after(async () => { ... })`; read headers/IP before scheduling (request APIs are read in the page body and passed in).
- [ ] `vitest.config.mts`: add `resolve.alias` `@` → `src`.
- [ ] Run `npm test && npx tsc --noEmit && npx eslint src` → all clean. Commit `chore: remove leftovers, stale copy and a blocking scan write`.

---

## Phase 2 — Roles and permissions

### Task 2: Schema for every phase

**Files:** Modify `prisma/schema.prisma`; create two migrations.

- [ ] Schema changes:
  - `enum Role { USER ADMIN SUPER_ADMIN }`; `User.roleChangedAt DateTime?`; `User.auditEntries AdminAuditLog[]`.
  - `Theme.qrBoxSize Int @default(40)`; `Product.stickerWidthMm Int @default(60)`; `SubscriptionPlan.intervalMonths Int @default(12)`.
  - `NotificationKind` + `QR_GENERATION_REMINDER`.
  - `model PlatformSetting { id String @id @default("default"); supportEmail String?; supportPhone String?; address String?; facebookUrl String?; whatsappUrl String?; announcement String?; ordersPaused Boolean @default(false); ordersPausedMessage String?; disabledGateways String[] @default([]); updatedAt DateTime @updatedAt }`.
  - `model AdminAuditLog { id String @id @default(cuid()); actorId String?; action String; targetType String; targetId String; summary String; createdAt DateTime @default(now()); actor User? @relation(fields: [actorId], references: [id], onDelete: SetNull); @@index([createdAt]) }`.
- [ ] `npx prisma migrate dev --name roles_stickers_saas` (adds enum value, columns, tables).
- [ ] Create `prisma/migrations/<ts>_promote_existing_admins/migration.sql` containing `UPDATE "User" SET "role" = 'SUPER_ADMIN' WHERE "role" = 'ADMIN';` — separate file because Postgres refuses to use a new enum value in the transaction that added it. Apply with `npx prisma migrate dev`.
- [ ] Seed: first admin is created as `SUPER_ADMIN`.
- [ ] Update `src/types/next-auth.d.ts` role unions to include `SUPER_ADMIN`.

### Task 3: Permission rules, guards, token freshness

**Files:** Create `src/lib/permissions.ts`, `src/lib/__tests__/permissions.test.ts`; modify `src/lib/admin-guards.ts`, `src/lib/__tests__/admin-guards.test.ts`, `src/lib/token-freshness.ts`, `src/lib/__tests__/token-freshness.test.ts`.

**Interfaces — Produces:**
```ts
export type Role = "USER" | "ADMIN" | "SUPER_ADMIN";
export type Permission = "console.view" | "users.manage" | "orders.manage" | "tags.manage" | "catalog.edit" | "plans.edit" | "money.manage" | "pricing.manage" | "destructive" | "admins.manage" | "settings.manage";
export function isStaff(role: string | null | undefined): boolean;
export function can(role: string | null | undefined, permission: Permission): boolean;
export function roleLabel(role: string): string; // "Customer" | "Admin" | "Super admin"
// admin-guards
export function canChangeRole(a: { actorId: string; targetId: string; targetRole: Role; targetStatus: Status; nextRole: Role; superAdminCount: number }): Guard;
export function canSetUserStatus(a: { actorId: string; targetId: string; targetRole: Role }): Guard;
// token-freshness
export function latest(...dates: (Date | null | undefined)[]): Date | null;
```

- [ ] Tests first (`permissions.test.ts`): every shared permission true for ADMIN and SUPER_ADMIN; each of the five super-only permissions false for ADMIN, true for SUPER_ADMIN; USER and unknown strings can nothing; `isStaff` for the three roles and `undefined`.
- [ ] Tests (`admin-guards.test.ts`, replacing demote/promote cases): self role change refused; no-op change refused (`nextRole === targetRole`); suspended target refused for promotion to any staff role; demoting or downgrading the only SUPER_ADMIN refused (`superAdminCount 1`, target SUPER_ADMIN, next ADMIN or USER); downgrading a SUPER_ADMIN when two exist allowed; ADMIN → USER allowed; USER → SUPER_ADMIN allowed; `canSetUserStatus` refuses self and any staff target.
- [ ] Tests (`token-freshness.test.ts`): `latest(null, undefined)` is null; returns the later of two dates; `isTokenStale(iat, latest(pw, role))` stale when only the role change is newer.
- [ ] Run `npx vitest run src/lib/__tests__/permissions.test.ts src/lib/__tests__/admin-guards.test.ts src/lib/__tests__/token-freshness.test.ts` → FAIL.
- [ ] Implement. Permission table:
```ts
const SHARED: Permission[] = ["console.view","users.manage","orders.manage","tags.manage","catalog.edit","plans.edit"];
const SUPER_ONLY: Permission[] = ["money.manage","pricing.manage","destructive","admins.manage","settings.manage"];
const TABLE: Record<Role, ReadonlySet<Permission>> = { USER: new Set(), ADMIN: new Set(SHARED), SUPER_ADMIN: new Set([...SHARED, ...SUPER_ONLY]) };
```
- [ ] Run the three test files → PASS.

### Task 4: Enforce roles across the console

**Files:** Modify `src/lib/session.ts`, `src/lib/auth.ts`, `src/proxy.ts`, `src/app/login/actions.ts`, `src/components/site-nav.tsx`, `src/lib/media-access.ts` (+ test), `src/app/dashboard/layout.tsx`, `src/app/admin/layout.tsx`, every `src/app/admin/**/page.tsx` and `actions.ts`; create `src/lib/audit.ts`, `src/components/admin/forbidden.tsx`, `src/components/admin/admin-nav.tsx`.

**Interfaces — Produces:**
```ts
// session.ts
export async function getAdmin(): Promise<AuthedUser | null>;            // any staff
export async function getStaffWith(p: Permission): Promise<AuthedUser | null>;
export async function requirePermission(p: Permission): Promise<AuthedUser>; // throws "Forbidden: …"
// audit.ts
export async function audit(actorId: string, action: string, target: { type: string; id: string }, summary: string): Promise<void>;
// components/admin/forbidden.tsx
export function Forbidden({ need }: { need?: string }): JSX.Element;
```

- [ ] `requireActiveUser` selects `roleChangedAt` and checks `isTokenStale(authAt, latest(passwordChangedAt, roleChangedAt))`.
- [ ] Proxy, login redirect, site nav, media access: `role === "ADMIN"` → `isStaff(role)`.
- [ ] Admin layout: `AdminNav` (client, `usePathname` for active state) receives only links the viewer `can` open; role badge; mobile toggle.
- [ ] Each admin page: `const admin = await getStaffWith("<perm>"); if (!admin) return <Forbidden />;` (layout already redirects non-staff). Payments → `money.manage`; Admins → `admins.manage`.
- [ ] Actions:
  - `setUserStatusAction` → `destructive`; audit `user.status`.
  - `updateCustomerIdentityAction` → `users.manage`; refuses staff targets.
  - `setTagStatusAction(tagId, status)` → `tags.manage`; `DEACTIVATED` additionally needs `destructive`; audit takedowns.
  - `resolveAbuseReportAction` → `console.view`.
  - Orders: `updateOrderStatusAction` → `money.manage` (audit); `updateFulfillmentAction`, `issueReplacementTagAction` → `orders.manage`.
  - Products: create → `pricing.manage`; update → `catalog.edit`, and price/qrSlots/status fields are only written when the actor has `pricing.manage` (otherwise the stored values are kept); archive → `destructive`; image → `catalog.edit`. Audit price/status/archive.
  - Themes: create/update/art → `catalog.edit`; archive → `destructive` (audit).
  - Admins: replace promote/demote with `setRoleAction(formData: userId|email, nextRole)` using `canChangeRole` inside a transaction that counts SUPER_ADMINs; stamps `roleChangedAt`; audit.
- [ ] UI hides controls without permission (status toggle, deactivate button, product price/slots/status inputs, archive buttons, order status select, revenue tile).
- [ ] Admins page lists ADMIN and SUPER_ADMIN with a role select per row and a promote form (email + role).
- [ ] Verify: tests/tsc/lint clean. Commit `feat(admin): super admin role and a permission table enforced across the console`.

---

## Phase 3 — Themed stickers

### Task 5: Sticker layout, rendering and PDF

**Files:** Create `src/lib/sticker-layout.ts`, `src/lib/sticker.ts`, `src/lib/__tests__/sticker-layout.test.ts`, `src/lib/__tests__/sticker-render.test.ts`; `npm i pdf-lib` and `npm i -D jsqr`.

**Interfaces — Produces:**
```ts
export type Box = { left: number; top: number; size: number };
export const QR_BOX_MIN = 20; export const QR_BOX_MAX = 80; export const QR_BOX_DEFAULT = 40;
export function clampBoxSize(pct: number): number;
export function qrBox(width: number, height: number, sizePct: number): Box;
export function mmToPt(mm: number): number;
export type StickerTheme = { name: string; tagline: string; bgColor: string; surfaceColor: string; inkColor: string; accentColor: string; qrBoxSize: number };
export function defaultArtworkSvg(theme: StickerTheme, size: number): string;
export type RenderedSticker = { png: Buffer; width: number; height: number };
export async function renderSticker(opts: { art: Buffer | null; theme: StickerTheme; url: string; maxEdge?: number }): Promise<RenderedSticker>;
export async function stickerPdf(stickers: RenderedSticker[], widthMm: number): Promise<Uint8Array>;
```

- [ ] Layout tests: `qrBox(1000,1000,40)` → `{left:300,top:300,size:400}`; wide `qrBox(2000,1000,50)` → `{left:750,top:250,size:500}`; tall `qrBox(1000,2000,50)` → `{left:250,top:750,size:500}`; `clampBoxSize` clamps 5→20, 95→80, NaN→40, 33.6→34; `mmToPt(25.4)` ≈ 72.
- [ ] Render tests: default art (no upload) 1200px → PNG 1200×1200; decode with `jsqr` over the raw RGBA of the box region and expect `data === url`; with a solid 1600×1000 red PNG as art, output keeps 1600×1000, the box's top-left pixel is white; `defaultArtworkSvg` escapes `<` in tagline; `stickerPdf` output starts with `%PDF` and has as many pages as stickers (load with `PDFDocument.load`).
- [ ] Run → FAIL. Implement:
  - `renderSticker`: base = art resized so longest edge ≤ `maxEdge` (default 2400) or default SVG rasterised at `maxEdge`; box = `qrBox`; QR via `QRCode.create(url, { errorCorrectionLevel: "Q" })`, modules drawn as SVG rects with a 2-module quiet zone on a white square of exactly `box.size`, rasterised by sharp; composite at `box.left/top`; `png()` out.
  - `stickerPdf`: `PDFDocument.create()`; per sticker page width `mmToPt(widthMm)`, height proportional; `embedPng`, draw full-bleed.
- [ ] Run → PASS. Dockerfile runner stage: `RUN apk add --no-cache font-dejavu fontconfig`.

### Task 6: Print readiness, routes and admin editors

**Files:** Create `src/lib/print.ts`, `src/lib/__tests__/print.test.ts`, `src/lib/sticker-server.ts`, `src/app/api/tags/[id]/sticker/route.ts`, `src/app/api/orders/[id]/stickers/route.ts`, `src/app/api/themes/[id]/preview/route.ts` (no file extensions in route segments), `src/app/admin/themes/[id]/qr-box-editor.tsx`; modify `src/app/api/tags/[id]/qr/route.ts`, `src/lib/media.ts`, `src/app/admin/themes/actions.ts`, `src/app/admin/themes/theme-form.tsx`, `src/app/admin/themes/[id]/art-upload.tsx`, `src/app/admin/products/product-form.tsx`, `src/app/admin/products/actions.ts`, `src/lib/validations.ts`.

**Interfaces — Produces:**
```ts
export type PrintLine = { quantity: number; qrSlots: number; tagsGenerated: number };
export type Readiness = { needed: number; generated: number; ready: boolean };
export function printReadiness(lines: readonly PrintLine[]): Readiness;
// sticker-server.ts
export async function stickerForTag(tagId: string, opts?: { thumb?: boolean }): Promise<RenderedSticker & { widthMm: number; shortCode: string } | null>;
export async function themePreview(themeId: string): Promise<RenderedSticker | null>;
```

- [ ] Print tests: empty lines → `{needed:0, generated:0, ready:true}`; `[{2,1,1}]` → needed 2, generated 1, not ready; over-generation (replacement) caps per line `[{1,1,3},{1,2,0}]` → needed 3, generated 1, not ready; all met → ready.
- [ ] Run → FAIL, implement, PASS.
- [ ] `media.ts`: `processThemeArt(input)` — 10 MB limit, jpeg/png/webp, longest edge ≤ 3000, PNG lossless. Theme art action uses it and the 10 MB check.
- [ ] Theme schema + form: `qrBoxSize` (coerce int 20–80); editor shows artwork (or `/api/themes/[id]/preview.png`) with a CSS overlay square at `left/top = (100 - size)/2 %` of the shorter side and a range input; after save shows the rendered preview.
- [ ] Product schema + form: `stickerWidthMm` (coerce int 20–300), editable with `catalog.edit`.
- [ ] Routes: sticker route authorizes owner (`requireActiveUser` + `tag.userId`) or `can(role,"tags.manage")`; `format=pdf` → `application/pdf` attachment `jogajog-sticker-<code>.pdf`; `size=thumb` → maxEdge 480. Order PDF → `orders.manage`, pages for non-DEACTIVATED tags, 404 when none. Theme preview public, `Cache-Control: public, max-age=300`, URL `${appUrl()}/demo?theme=<slug>`, maxEdge 900. QR route also allows `tags.manage`.
- [ ] Verify; commit `feat(stickers): composite the QR into the centre of the theme artwork`.

### Task 7: Sticker UI, print gating and reminders

**Files:** Modify `src/app/dashboard/tags/page.tsx`, `src/app/dashboard/tags/[id]/page.tsx`, `src/app/admin/orders/actions.ts`, `src/app/admin/orders/[id]/page.tsx`, `src/app/admin/orders/order-controls.tsx`, `src/app/admin/tags/[id]/page.tsx`, `src/lib/payments/settle.ts`, `src/lib/notify/render.ts`, `src/lib/notify/index.ts`, `src/lib/__tests__/notify-render.test.ts`, `src/app/dashboard/page.tsx`, `src/app/checkout/success/page.tsx`.

**Interfaces — Produces:**
```ts
export function renderQrReminder(p: { count: number; tagsUrl: string }): Rendered;
export async function notifyQrGenerationNeeded(p: { userId: string; email: string; count: number }): Promise<void>;
export async function sendQrReminderAction(orderId: string): Promise<OrderActionState>;
```

- [ ] Render test: subject contains "QR"; body contains the count and the URL; count 1 singular "code", 2 plural "codes".
- [ ] Customer tag page hero: `<img src="/api/tags/{id}/sticker?size=thumb">` in a card; links Download sticker (PNG), Download sticker (PDF), QR only, View public page. Tag list thumbnails use the thumb sticker.
- [ ] `updateFulfillmentAction`: when moving `UNFULFILLED → PROCESSING`, load lines with `_count.tags` and refuse unless `printReadiness(...).ready` ("Waiting for the customer to generate N of M QR codes.").
- [ ] Admin order page: readiness banner, per-tag sticker thumbnail + theme name + PNG/PDF links, "Download print PDF" (disabled until ready), "Remind customer" (`sendQrReminderAction`, `rateLimit("qr-reminder:"+orderId,{limit:1, windowMs: 86_400_000})`).
- [ ] `settle.ts`: after an ORDER succeeds, `after(() => notifyQrGenerationNeeded(...))` outside the transaction with the slots the order granted.
- [ ] Dashboard overview and checkout success: banner "Generate your QR so we can print your sticker" when `slotBalanceForUser().available > 0`.
- [ ] Admin tag detail: sticker preview and downloads.
- [ ] Verify; commit `feat(stickers): sticker downloads, print gating and QR reminders`.

---

## Phase 4 — SaaS management, settings, activity

### Task 8: Plans

**Files:** Create `src/app/admin/plans/page.tsx`, `src/app/admin/plans/actions.ts`, `src/app/admin/plans/plan-form.tsx`, `src/lib/__tests__/plan-validation.test.ts`; modify `src/lib/validations.ts`, `src/lib/payments/settle.ts`, `src/app/dashboard/subscription/page.tsx`, `prisma/seed.ts`.

**Interfaces — Produces:**
```ts
export const planSchema: z.ZodType<{ slug: string; name: string; priceCents: number; intervalMonths: 1|6|12; features: string[]; isActive: boolean }>;
export const planTextSchema: z.ZodType<{ name: string; features: string[] }>;
export function intervalLabel(months: number): string; // "month" | "6 months" | "year"
```
- [ ] Tests: features split from newline text, trimmed, blanks dropped, max 8; `intervalMonths` 3 rejected; negative price rejected; `intervalLabel`.
- [ ] Settlement: subscription include `plan.intervalMonths`; `currentPeriodEnd = extendPeriod(sub.currentPeriodEnd, plan.intervalMonths, now)` (from Task 9's module — create `subscription-periods.ts` here with its tests if Task 9 is not done yet).
- [ ] Plans page: table with subscriber counts; `plans.edit` edits name/features; `pricing.manage` creates, sets price/interval, toggles active (audited).
- [ ] Customer page shows `/ {intervalLabel}`.

### Task 9: Subscriptions console

**Files:** Create `src/lib/subscription-periods.ts`, `src/lib/__tests__/subscription-periods.test.ts`, `src/app/admin/subscriptions/[id]/page.tsx`, `src/app/admin/subscriptions/actions.ts`, `src/app/admin/subscriptions/subscription-controls.tsx`; modify `src/lib/subscription.ts`, `src/app/admin/subscriptions/page.tsx`, `src/app/admin/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/users/[id]/page.tsx`.

**Interfaces — Produces:**
```ts
export type Bucket = "active" | "expiring" | "expired" | "cancelled";
export function addMonths(date: Date, months: number): Date;         // clamps day-of-month (Jan 31 + 1 → Feb 28/29)
export function extendPeriod(periodEnd: Date, months: number, now: Date): Date; // from max(periodEnd, now)
export function daysLeft(periodEnd: Date, now: Date): number;          // ceil, min 0
export function subscriptionBucket(s: { status: string; currentPeriodEnd: Date }, now: Date): Bucket;
// subscription.ts
export function entitledWhere(now: Date): Prisma.SubscriptionWhereInput;
export function bucketWhere(bucket: Bucket, now: Date): Prisma.SubscriptionWhereInput;
// actions (money.manage, audited)
export async function extendSubscriptionAction(id: string, months: number): Promise<{ error?: string; ok?: boolean }>;
export async function grantComplimentaryAction(userId: string, planId: string, months: number): Promise<{ error?: string; ok?: boolean }>;
export async function cancelSubscriptionNowAction(id: string): Promise<{ error?: string; ok?: boolean }>;
```
- [ ] Tests: `addMonths(2026-01-31, 1)` → 2026-02-28; `extendPeriod` future end adds to end, past end adds to now; `daysLeft` 1.2 days → 2, past → 0; bucket: ACTIVE ending in 3 days → expiring, in 30 → active, ended → expired, CANCELED → cancelled, TRIALING in 30 → active.
- [ ] Console: filter tabs + email search + days left + "Complimentary" badge for TRIALING; detail page with payments and controls; overview/users use `entitledWhere`.

### Task 10: Settings, gateways, maintenance, activity

**Files:** Create `src/lib/settings.ts`, `src/lib/payments/enabled.ts`, `src/lib/__tests__/enabled-gateways.test.ts`, `src/lib/maintenance.ts`, `src/app/admin/settings/page.tsx`, `src/app/admin/settings/actions.ts`, `src/app/admin/settings/settings-form.tsx`, `src/app/admin/activity/page.tsx`, `src/components/announcement-bar.tsx`; modify `src/app/api/maintenance/route.ts`, `src/app/checkout/page.tsx`, `src/app/checkout/actions.ts`, `src/app/dashboard/subscription/page.tsx`, `src/app/dashboard/subscription/actions.ts`, `src/app/cart/page.tsx`, `src/components/site-nav.tsx`.

**Interfaces — Produces:**
```ts
export type PlatformSettings = { supportEmail: string | null; supportPhone: string | null; address: string | null; facebookUrl: string | null; whatsappUrl: string | null; announcement: string | null; ordersPaused: boolean; ordersPausedMessage: string | null; disabledGateways: string[] };
export async function getSettings(): Promise<PlatformSettings>;
export function enabledProviderIds(configured: readonly string[], disabled: readonly string[]): string[];
export async function enabledGateways(): Promise<PaymentGateway[]>;
export async function enabledGatewayFor(id: string): Promise<PaymentGateway>; // throws GatewayError
export async function runMaintenance(now?: number): Promise<{ notified: number; prunedCounters: number; prunedNotifications: number }>;
```
- [ ] Tests: disabled ids removed, order preserved, unknown disabled ids ignored, DEMO never re-added.
- [ ] Settings form validated with zod (emails, http(s) URLs, 200-char announcement); save audited.
- [ ] Checkout/subscription pages and actions use `enabledGateways`/`enabledGatewayFor`; `ordersPaused` blocks checkout action and shows a notice on cart and checkout.
- [ ] Activity page: latest 200 audit rows with actor name.
- [ ] Verify; commit `feat(saas): plans, subscription tools, platform settings and an activity log`.

---

## Phase 5 — Monitoring

### Task 11: Search, pagination, charts, attention list

**Files:** Create `src/lib/pagination.ts`, `src/lib/daily.ts`, `src/lib/__tests__/pagination.test.ts`, `src/lib/__tests__/daily.test.ts`, `src/components/admin/pagination.tsx`, `src/components/admin/bar-chart.tsx`, `src/components/admin/search-form.tsx`; modify `src/app/admin/page.tsx`, `src/app/admin/tags/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/users/[id]/page.tsx`, `src/app/admin/scans/page.tsx`.

**Interfaces — Produces:**
```ts
export function pageParams(raw: string | undefined, perPage?: number): { page: number; skip: number; take: number };
export function pageCount(total: number, perPage?: number): number;
export type DayCount = { day: string; count: number }; // day = YYYY-MM-DD (UTC)
export function fillDays(rows: readonly { day: string; count: number }[], days: number, now: Date): DayCount[];
export async function dailyScanCounts(days: number, now?: Date): Promise<DayCount[]>;
```
- [ ] Tests: `pageParams("3")` → skip 100 take 50; garbage/negative → page 1; `pageCount(0)` → 1, `pageCount(101)` → 3; `fillDays` returns exactly `days` entries oldest first, zero-filled, ending at `now`'s UTC day.
- [ ] Read the `dataviz` skill before writing `BarChart`.
- [ ] Overview: permission-filtered tiles, 30-day scans chart, Needs attention list.
- [ ] Tags/users: `q` search (`contains`, insensitive), filters kept in links, pagination. Scans: `range=24h|7d|30d`, chart, top tags.
- [ ] Verify; commit `feat(admin): search, pagination, scan charts and a needs-attention list`.

---

## Phase 6 — Public site and dashboards

### Task 12: Shared site pieces and content pages

**Files:** Create `src/components/reveal.tsx`, `src/components/nav-link.tsx`, `src/components/mobile-menu.tsx`, `src/components/icons.tsx`, `src/components/scan-layout.tsx`, `src/lib/demo-profile.ts`, `src/app/demo/page.tsx`, `src/app/about/page.tsx`, `src/app/contact/page.tsx`, `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`; modify `src/app/globals.css`, `src/components/site-nav.tsx`, `src/components/site-footer.tsx`, `src/app/t/[shortCode]/page.tsx`, `src/components/public-profile-card.tsx`, `src/app/sitemap.ts`.

- [ ] `Reveal`: client; `IntersectionObserver` adds `is-visible` once; CSS `.reveal{opacity:0;transform:translateY(16px)}` only inside the no-preference media query, so reduced motion sees content immediately.
- [ ] `ScanLayout` extracted from the scan page; `PublicProfileCard` gains `demo?: boolean` which renders a disabled relay form.
- [ ] `/demo?theme=slug` renders the demo profile in that theme (default theme fallback), `noindex`.
- [ ] Footer async: settings contact details, three link columns. Nav: active link, Pricing (`/#pricing`), mobile menu, announcement bar.
- [ ] Content pages use settings for contact info; sitemap lists them.

### Task 13: Home, shop and themes

**Files:** Create `src/components/demo-phone.tsx`, `src/components/home/*.tsx` as needed; modify `src/app/page.tsx`, `src/app/shop/page.tsx`, `src/app/shop/[slug]/page.tsx`, `src/app/themes/page.tsx`, `src/app/globals.css`.

- [ ] Home sections in order: hero (phone mockup + scan-line animation), counters (tags, scans, active themes), how it works (4 steps), live demo (`DemoPhone` cycles themes every 4 s, buttons to pick, pauses on hover/focus), stickers (product cards with `/api/themes/{id}/preview.png`), pricing (`id="pricing"`, sticker one-time + active plans from DB + "without a plan" list), privacy promises, use cases, FAQ (`<details>`), closing CTA. Every section wrapped in `Reveal`.
- [ ] Shop/product/themes use the theme preview image when a product has no uploaded image of its own, and show "Your QR goes in the middle".

### Task 14: Dashboards

**Files:** Modify `src/app/dashboard/layout.tsx`, `src/app/dashboard/page.tsx`, `src/app/admin/layout.tsx`.

- [ ] Customer layout: brand sidebar with icons + active state (`NavLink`), sticky mobile top bar with `MobileMenu`.
- [ ] Overview: getting-started checklist (profile filled, sticker bought, QR generated, plan active) with progress bar; status cards (page live, QR codes, scans in 30 days, messages); QR banner; existing recent lists restyled.
- [ ] Verify; commit `feat(site): fuller home page, content pages, demo scan page and dashboard navigation`.

### Task 15: Docs and end-to-end verification

- [ ] README: rewrite the opening and layout section to the real model; document roles, stickers, settings, activity, new env/deps.
- [ ] `npm test`, `npx tsc --noEmit`, `npx eslint src`, `npm run build`.
- [ ] Run the app on a free port with `NEXT_PUBLIC_APP_URL` matching; seed; in a browser: sign in as super admin, create a regular admin, confirm hidden links and Forbidden page; set a theme square size; buy a sticker with DEMO; generate a QR; download sticker PNG/PDF; decode the sticker QR; open the scan page; move the order to processing; check the home page at 400px width.
- [ ] Commit `docs: README for roles, stickers and SaaS tools`.
