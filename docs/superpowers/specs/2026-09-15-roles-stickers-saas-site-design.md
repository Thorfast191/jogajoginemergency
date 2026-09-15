# Super admin, themed stickers, SaaS management and a fuller site

Date: 2026-09-15
Status: approved (sections 1–3 reviewed one by one; 4–5 follow the options chosen in the same session)

## Why

An audit of the running product against how it is meant to work found:

1. A theme's artwork is meant to leave an empty square in the middle, and the
   customer's generated QR is meant to sit in it. Nothing does that: theme art is
   a plain upload shrunk to 1024px and the only download is a bare QR.
2. There is one `ADMIN` role with every power. The platform needs a super admin
   who holds money, pricing, destructive actions, admin management and settings,
   and regular admins who run users, orders, subscriptions, monitoring, QR codes
   and the catalogue.
3. Subscription plans exist only in the seed, and nobody can extend, grant or
   cancel a subscription from the console.
4. The admin console cannot search, page or preview what customers generated.
5. The public site is three sections long and the dashboards are bare lists.
6. A handful of stale copy, dead links and leftovers (see Cleanup).

## Decisions taken

- **The subscription gates the whole scan page** (unchanged). Without an active
  subscription a scan shows nothing about the owner; the relay stays open.
- Super admin only: admin management, money & revenue, pricing, destructive
  actions, platform settings.
- The QR square is always centred; its size is set per theme.
- Stickers are printed by us and shipped, and the customer can also download
  them. QR codes are black on white.
- The site gets a live scan-page demo, products & pricing, FAQ & trust pages and
  scroll animations. No animation library: CSS plus one small reveal component.
- One spec, one plan, built and committed in phases.

## 1. Roles and permissions

`Role` gains `SUPER_ADMIN`. A migration turns every existing `ADMIN` into
`SUPER_ADMIN`, so nobody loses access.

`src/lib/permissions.ts` is the only place a role is interpreted:

| Permission | ADMIN | SUPER_ADMIN |
|---|---|---|
| `console.view` — overview (no revenue), scans, abuse reports, own profile | ✓ | ✓ |
| `users.manage` — list, search, edit customer name/email | ✓ | ✓ |
| `orders.manage` — list, fulfilment, print files, replacement QR, reminders | ✓ | ✓ |
| `tags.manage` — list, search, sticker preview/download, lost/active | ✓ | ✓ |
| `catalog.edit` — product/theme text, images, artwork, QR square, sticker width; create/edit themes | ✓ | ✓ |
| `plans.edit` — plan name and features text | ✓ | ✓ |
| `money.manage` — payments, revenue, order paid/cancel/refund, grant/extend/cancel subscriptions | | ✓ |
| `pricing.manage` — create products, price, QR slots, product status; create plans, price, period, on/off | | ✓ |
| `destructive` — archive products/themes, deactivate QR, suspend/reactivate users | | ✓ |
| `admins.manage` — promote, demote, switch ADMIN ⇄ SUPER_ADMIN | | ✓ |
| `settings.manage` — platform settings, activity log, maintenance | | ✓ |

- `session.ts` gains `getStaff()` and `requirePermission(p)`; pages call
  `getStaffWith(p)` and render a shared "Super admins only" state when refused.
- Nav links, buttons and form fields a role cannot use are not rendered. Server
  actions check regardless.
- Guards (`admin-guards.ts`, pure, tested): nobody changes their own role or
  suspends themselves; the last `SUPER_ADMIN` cannot be demoted; only `ACTIVE`
  accounts are promoted; staff are never suspended without being demoted first.
- **Bug fixed:** the JWT carries the role. A demoted admin's token still said
  ADMIN, so the proxy and the layouts redirected each other forever. Any role
  change now stamps `User.roleChangedAt`, and `isTokenStale` rejects tokens
  minted before the later of `passwordChangedAt` and `roleChangedAt`.

## 2. Themed stickers

Data:
- `Theme.qrBoxSize Int @default(40)` — the centred square, % of the artwork's
  shorter side, 20–80.
- `Product.stickerWidthMm Int @default(60)` — printed width for the PDF, 20–300.
- Theme artwork is stored at print resolution: longest edge up to 3000px,
  lossless PNG, 10 MB upload limit.

`src/lib/sticker.ts`:
- `qrBox(width, height, sizePct)` — pure; the centred square in whole pixels.
- `defaultArtworkSvg(theme)` — when a theme has no artwork: theme background,
  wordmark and mascot at the top, a white centred square, the tagline beneath.
- `renderSticker({ art, theme, url })` — composites a black-on-white QR (error
  correction `Q`, integer module scale, white quiet zone) into the square with
  `sharp`. PNG out.
- `stickerPdf(pages, widthMm)` — `pdf-lib`, one page per sticker at real size.

Routes:
- `GET /api/tags/[id]/sticker?format=png|pdf&size=thumb` — owner or staff with
  `tags.manage`. `private, no-store`: the image carries the short code.
- `GET /api/orders/[id]/stickers.pdf` — staff with `orders.manage`; every
  non-deactivated tag on the order, one page each.
- `GET /api/themes/[id]/preview.png` — public; the QR encodes `/demo?theme=slug`,
  never a real profile.
- `GET /api/tags/[id]/qr` — unchanged for owners, now also open to staff.

UI:
- Admin theme editor: artwork upload, QR square slider with a live CSS overlay
  and sample QR, the rendered preview after saving, and the hint "Leave an empty
  square in the centre of your design".
- Customer tag page: the finished sticker is the hero card; Download sticker
  (PNG), Download sticker (PDF), QR only, View public page. Tag list thumbnails
  are sticker thumbnails.

Print flow:
- `printReadiness(lines)` — pure; a paid order is ready to print when every line
  has generated `quantity × qrSlots` tags.
- Fulfilment cannot move `UNFULFILLED → PROCESSING` until ready; the admin order
  page shows "Waiting for customer: 1 of 2 QR codes generated" and which theme
  each sticker prints in (the tag's current theme).
- On settlement of an order the customer is emailed to generate their QR
  (`NotificationKind.QR_GENERATION_REMINDER`). Staff can resend from the order,
  at most once a day. The dashboard and checkout success page show the same
  prompt while any paid slot is unused.

Tests: `qrBox` for square/wide/tall art; `printReadiness`; sticker access; a
render test that decodes the QR back out of the composited PNG (`jsqr`, dev only)
and checks it resolves to the tag's URL. The `Dockerfile` installs a font package
so `librsvg` renders the default artwork's text in production.

## 3. Subscription management, settings and activity

Plans — `/admin/plans`:
- `SubscriptionPlan.intervalMonths Int @default(12)` (1, 6 or 12). Settlement
  extends by the plan's interval instead of a hard-coded year; the customer page
  shows the real period.
- Everyone with `plans.edit` edits name and features; `pricing.manage` creates
  plans, sets price and interval, and switches plans on/off. Switching off hides
  a plan from customers; subscribers keep their paid time.

Subscriptions — `/admin/subscriptions` and `/admin/subscriptions/[id]`:
- Filters Active / Expiring in 7 days / Expired / Cancelled, email search, days
  left. "Active" is the entitlement rule (status and period end), shared with the
  scan page through one helper.
- `money.manage` actions: extend by N months (from the later of now and the
  period end), grant complimentary time (`TRIALING`, labelled Complimentary),
  cancel now (status `CANCELED`, period end now). The admin user page shows the
  same card.

Platform settings — `/admin/settings` (`settings.manage`):
- Singleton `PlatformSetting`: support email, phone, address, Facebook and
  WhatsApp links, announcement banner text, `ordersPaused` + message, and
  `disabledGateways String[]` (credentials stay in `.env`; this only hides a
  configured gateway).
- Maintenance: a Run now button sharing its implementation with
  `/api/maintenance` (moved into `src/lib/maintenance.ts`), and the latest failed
  notifications.

Activity — `/admin/activity` (`settings.manage`):
- `AdminAuditLog { actorId, action, targetType, targetId, summary, createdAt }`,
  written by every money, pricing, destructive and admin-management action.

Tests: plan validation, `extendPeriod`, subscription buckets, gateway filtering,
audit rows written by the guarded actions.

## 4. Admin monitoring and cleanup

Monitoring:
- Overview: KPI tiles filtered by permission; a 30-day scans-per-day bar chart
  (inline SVG, no library); "Needs attention" — paid orders waiting for QR or for
  printing, open abuse reports, subscriptions expiring within 7 days, failed
  emails (super admins).
- Tags: search by code, label or owner email; status/product filters; 50 per
  page; sticker thumbnails. Tag detail shows the sticker and its downloads.
- Users: search by name/email, role and status filters, 50 per page. User detail
  adds scans, messages and profile completeness.
- Scans: 24h / 7d / 30d range, daily chart, most-scanned tags.

Cleanup:
- Remove the stray backticks at the end of `src/app/dashboard/tags/actions.ts`.
- Remove the dead `/admin/tags/issued` link from the overview.
- Admin counts and the users "Plan" column use the entitlement rule.
- Subscription page: drop "any theme on any tag".
- Admin subscriptions page: drop the stale "DEMO until a live gateway" line.
- Dashboard order detail: remove the empty "claim" label.
- `validations.ts`: remove `claimSchema`, `tagBatchSchema` and the inventory-era
  comment. `proxy.ts`: remove `/claim`.
- Scans page: remove the impossible "Unassigned" branch.
- README: the opening describes admin-minted inventory, `TagBatch` and
  `claim-code.ts`, none of which exist; rewrite to match the model.
- Scan page: scan logging and the owner email move into `after()`, so a finder's
  page is not held up by a database write and an SMTP round trip.

## 5. Public site and dashboards

- `Reveal` client component: IntersectionObserver adds a class; CSS does the
  motion; under `prefers-reduced-motion` content is simply visible.
- Home: hero with an animated phone and a scanning line; announcement banner;
  live counters (QR codes protected, scans answered, themes); how it works in
  four steps; the live scan-page demo cycling through themes; sticker cards
  showing the artwork with a sample QR; pricing explainer (sticker one-time,
  plan publishes the page, what happens without it); privacy promises; use cases;
  FAQ; closing call to action.
- New pages: `/demo` (a sample scan page, the target of every sample QR), `/about`,
  `/contact` (details from settings), `/privacy`, `/terms`. Sitemap updated.
- Footer with product, company and legal columns plus contact details.
- Site nav: active link, Pricing link, mobile menu.
- Shop and themes: sticker previews with the QR in place; reveal on scroll.
- Customer dashboard: sidebar with icons and active state, mobile drawer,
  overview with a getting-started checklist (profile → sticker → QR → plan),
  status cards and the "generate your QR" banner.
- Admin console: the same nav treatment, a role badge, links filtered by
  permission.
- Orders paused (settings) shows a notice in the cart and blocks checkout.

## Out of scope

SMS, live gateway sandbox runs, carrier integration, translated UI, licensed
characters.
