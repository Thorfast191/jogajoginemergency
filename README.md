# Jogajog Emergency

Two connected products:

1. **A QR-sticker store.** Customers buy physical, themed stickers (bike, car, luggage,
   helmet) with a **one-time payment**, choosing the artwork at checkout. Every sticker's
   artwork leaves an empty square in the middle; the customer's own QR code is printed into
   that square.
2. **An emergency-profile SaaS.** The account, the emergency profile, per-field privacy, and
   the public page a finder or first responder lands on when they scan. A **plan
   (subscription)** is what publishes that page.

## The model

**The sticker is a one-time purchase. The page it opens is the subscription.**

- Buying a sticker grants **QR slots** — the right to generate that many codes
  (`src/lib/slots.ts`). There is no pre-minted inventory.
- **Paying mints that order's codes** (`issueTagsForOrder` in `src/lib/tag-issue.ts`), so the
  order is printable at once and the customer has nothing to press. Scoped to the order that
  was paid: an unspent slot from an older purchase is left alone, because a permanent printed
  link is not a side effect to hand someone. The Generate button in the client area stays for
  what that leaves — a slot freed by deleting a code, or an order whose issue failed.
- We composite each code into the centre of the sticker's theme artwork, print it and ship it;
  the customer can also download the finished sticker (PNG, or a real-size PDF) to reprint.
- A plan can be added to the sticker's own checkout (`Order.planId`), so publishing the page is
  one payment rather than a second one discovered afterwards. The same verified callback that
  marks the order paid activates the subscription.
- Without an active plan a scan reaches a **dormant page**: nothing about the owner is shown,
  but the anonymous relay stays open so a found item can still be returned. That is one named
  constant, `LAPSED_BEHAVIOUR` in `src/lib/entitlements.ts`.
- "Entitled" means status `ACTIVE`/`TRIALING` **and** a period end in the future. The rule lives
  in `src/lib/entitlements.ts` + `src/lib/subscription.ts` (`entitledWhere`), and every count in
  the console uses the same helper as the scan page.

## Themed stickers

A `Theme` is the artwork printed on a sticker and the skin of the scan page. **The buyer picks
it at checkout** — any sticker can be bought in any live theme, and the choice is recorded on
the order line (`OrderItem.themeId`, falling back to `Product.themeId` for lines bought before
the shop offered the choice). Buying a sticker in a theme is what unlocks that theme on the
account (`src/lib/theme-access.ts`), so the picker links a locked one to the cheapest sticker
with it already selected.

- `Theme.qrBoxSize` (20–80, default 40) is the empty square's side as a percentage of the
  artwork's **shorter** edge. The square is always centred (`src/lib/sticker-layout.ts`).
- `src/lib/sticker.ts` composites a **black-on-white** QR (error correction Q, whole-pixel
  modules, a white quiet zone) into the square with `sharp`, and lays out real-size PDFs with
  `pdf-lib`. A theme with no uploaded artwork gets a generated design in its colours. A test
  decodes the QR back out of the rendered image (`jsqr`) and checks it opens the right page.
- Artwork uploads are kept at print quality (longest edge 3000px, lossless PNG, 10 MB).
- `Product.stickerWidthMm` sizes the PDF. Stickers render on demand and are never stored, so
  replacing artwork or resizing the square updates every sticker.

| Route | Who | What |
|---|---|---|
| `/api/tags/[id]/sticker?format=png\|pdf&size=thumb&download=1` | owner, or staff with `tags.manage` | the finished sticker |
| `/api/tags/[id]/qr` | owner, or staff with `tags.manage` | the bare QR |
| `/api/orders/[id]/stickers` | staff with `orders.manage` | print file, one page per sticker |
| `/api/themes/[id]/preview` | public for live themes | sample QR pointing at `/demo` |

**Print flow.** A paid order can't move to *Processing* until every QR on it is generated
(`printReadiness` in `src/lib/print.ts`) — which paying normally satisfies on the spot. The
reminder email sends nothing when an order needs no more codes, so it now only speaks up if
automatic issuing failed; staff can resend it once a day from the order page.

The Docker runner installs `font-dejavu` so librsvg renders generated artwork's text.

## Roles and permissions

`USER`, `ADMIN`, `SUPER_ADMIN`. `src/lib/permissions.ts` is the only place a role is
interpreted; pages render a *Forbidden* state, the menu hides links, and server actions check
regardless.

| | Admin | Super admin |
|---|---|---|
| Overview, scans, abuse reports | ✓ | ✓ + revenue |
| Users: search, fix name/email | ✓ | ✓ + suspend/reactivate |
| Orders: fulfilment, print files, replacement QR, reminders | ✓ | ✓ + mark paid/cancel/refund |
| Generated QR codes: search, stickers, lost/active | ✓ | ✓ + deactivate (takedown) |
| Products & themes: content, images, artwork, QR square | ✓ | ✓ + create products, prices, QR slots, publish, archive |
| Plans: name & features | ✓ | ✓ + create, price, billing period, on/off |
| Subscriptions: view | ✓ | ✓ + extend, grant complimentary, cancel now |
| Payments, admins, platform settings, activity log | | ✓ |

Guards (`src/lib/admin-guards.ts`): nobody changes their own role or suspends themselves, the
last super admin can't be demoted, and only active accounts get admin access. A role change
stamps `User.roleChangedAt`, which revokes that person's outstanding JWTs.

Every money, pricing, destructive and admin-management action writes an `AdminAuditLog` row,
shown at `/admin/activity`.

## Plans, settings and monitoring

- **Plans** (`/admin/plans`) have a billing period of 1, 6 or 12 months. Settlement extends
  from the current period end while it is still ahead, so renewing early never loses time.
- **Subscriptions** (`/admin/subscriptions`) filter into Active / Expiring in 7 days / Expired /
  Cancelled. Complimentary time is recorded as `TRIALING`.
- **Platform settings** (`/admin/settings`, one `PlatformSetting` row): support contacts shown
  in the footer and Contact page, an announcement banner, **pause orders**, and switching off
  configured gateways (in-flight payments still settle). Credentials stay in `.env`.
- **Overview** shows permission-filtered tiles, scans per day for 30 days, and a
  needs-attention list (orders ready to print or waiting on customers, abuse reports,
  expiring plans, failed emails). QR codes, users, subscriptions and scans are searchable and
  paged.

## Public site

`/` (hero, how it works, a live demo phone cycling through themes, stickers, pricing,
privacy, FAQ), `/shop`, `/shop/[slug]`, `/themes`, `/demo` (a sample scan page; every sample QR
points here), `/about`, `/contact`, `/privacy`, `/terms`, `/cart`, `/checkout`, and
`/t/[shortCode]` — the no-login page a finder lands on. Motion is CSS plus one `Reveal`
component, and all of it switches off under `prefers-reduced-motion`.

> The Privacy and Terms pages are a plain-language description of how the product behaves.
> Have them reviewed before launch.

## Stack

Next.js 16 (App Router; the proxy file is `src/proxy.ts`) + PostgreSQL + Prisma 6 + Auth.js
(credentials, JWT sessions) + Tailwind v4 + `sharp` + `qrcode` + `pdf-lib`. Payments go
through bKash, Nagad or SSLCommerz. Tests: Vitest (`npm test`) — the rules, not the UI.

## Local setup

1. PostgreSQL 14+ with `DATABASE_URL` in `.env` (`docker compose up -d postgres`).
2. `npm install`
3. `npx prisma migrate deploy`
4. `npm run db:seed` — seven themes (including the free `jogajog-emergency` default), the
   Plus plan, four sticker products, and the first **super admin**. The seed prints a generated
   password once unless you set `SEED_ADMIN_PASSWORD`; change it at `/admin/profile`.
5. `npm run dev`

`NEXT_PUBLIC_APP_URL` must match the port the app actually runs on — QR codes and payment
callbacks are built from it. If port 3000 is taken, run `npm run dev -- -p 3100` and set
`NEXT_PUBLIC_APP_URL=http://localhost:3100`.

## Environment

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | Auth.js JWT signing secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` | App URLs |
| `IP_HASH_SALT` | Salt for hashing scanner IPs (`src/lib/hash.ts`) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | The seeded super admin |
| `PAYMENT_MODE` | `sandbox` (default) or `live`; `live` disables the DEMO provider |
| `BKASH_*`, `NAGAD_*`, `SSLCOMMERZ_*` | Gateway credentials — see `.env.example` |
| `SMTP_*`, `MAIL_FROM` | Outgoing mail; without these nothing is delivered |
| `MAINTENANCE_SECRET` | Bearer token for `/api/maintenance`; unset means it 404s |
| `RATE_LIMIT_STORE` | `postgres` to share rate limits across instances |
| `TRUSTED_PROXY_HOPS` | Proxies in front of the app (default 1). Set 0 when nothing is |

## Project layout

- `prisma/schema.prisma` — `User`, `Theme`, `Product`, `Order`, `OrderItem`, `Payment`, `Tag`,
  `EmergencyProfile`, `EmergencyContact`, `ProfileLink`, `MediaAsset`, `ScanEvent`,
  `RelayMessage`, `AbuseReport`, `SubscriptionPlan`, `Subscription`, `PlatformSetting`,
  `AdminAuditLog`, `NotificationLog`, `RateLimitCounter`.
- `src/app/dashboard/*` — **client area**: Overview (getting-started checklist), My QR codes
  (generate, sticker downloads, theme picker), Emergency profile, Privacy, Messages, Plan,
  Orders, Settings.
- `src/app/admin/*` — **console**: Overview, Orders, Products, Themes, Generated QR codes,
  Users, Subscriptions, Plans, Payments, Scan activity, Abuse reports, Admins, Settings,
  Activity log, My profile.
- `src/lib/session.ts` — `requireActiveUser`, `getAdmin`, `getStaffWith`, `requirePermission`,
  `getCustomer`, `requireCustomer`.
- `src/lib/tag-issue.ts` — the one place a purchased slot becomes a code, for both the automatic
  path and the Generate button.
- `src/lib/` rules, each with tests: `permissions`, `admin-guards`, `token-freshness`,
  `entitlements`, `subscription-periods`, `slots`, `print`, `sticker-layout`, `theme-access`,
  `public-profile`, `privacy`, `media-access`, `gateway-filter`, `pagination`, `daily`, `cart`,
  `order`, `money`, `env`, `rate-limit`, `notify/render`.

## Payments

Three gateways — **bKash**, **Nagad** and **SSLCommerz** — behind one interface
(`src/lib/payments/`). A provider whose environment variables are blank is not offered, and a
super admin can switch off a configured one (`src/lib/payments/enabled.ts`). A `DEMO` provider
takes no money for local development, and is refused when `PAYMENT_MODE=live`. It stops on a
demo payment page (`/checkout/demo`) where you choose to pay, decline or cancel; those buttons
are plain links, so the return to the callback is a real page load as it is with a provider.
A Server Action redirect to our own origin is a client-side navigation, which ran the callback
without the browser ever requesting it — and so never cleared the cart.

**Nothing in a callback is treated as evidence.** `settlePayment` re-verifies with the
provider and checks the amount and currency match before fulfilling anything. Settlement is
idempotent: providers retry callbacks, and a success is final. The gateway request shapes are
written to each provider's published sandbox API but **have not been run against a live
sandbox** — that needs merchant credentials.

## Notifications

Email goes out through SMTP. Every message is written to a `NotificationLog` outbox before it
is sent and marked `SENT` only once the transport accepts it; failures show on the settings
page. Bodies are pure, escaped functions in `src/lib/notify/render.ts`. Kinds: scan alerts
(throttled to one per tag per ten minutes, and switchable off), finder messages, password
resets, QR-generation reminders and plan-expiry warnings.

## Operations

`GET|POST /api/maintenance` with `Authorization: Bearer $MAINTENANCE_SECRET` sends expiry
warnings (7, 1 and 0 days), prunes rate-limit counters and drops notification rows older than
90 days. It is idempotent. A super admin can run the same job from `/admin/settings`.

```
0 9 * * *  curl -fsS -H "Authorization: Bearer $MAINTENANCE_SECRET" https://…/api/maintenance
```

## Cart & checkout

The cart is an `httpOnly` cookie of `{ l: [{ slug, qty, theme }], p: planSlug }` — a bare
`[{ slug, qty }]` array from an older deploy is still read. Prices, themes and the plan are
always re-read from the database at checkout, so a tampered cookie can only choose *what*, never
*what it costs*. The same product in two themes is two lines.

Checkout creates a `PENDING` order and hands off to the chosen gateway;
`Order.idempotencyKey` makes a double-submit return the original order, and `orderMatchesCart`
plus `orderPlanMatchesCart` refuse to bill a changed cart against it — including a plan or a
theme swapped in after the order was priced. `Order.subtotalCents` is the stickers;
`totalCents` adds the plan. When orders are paused in settings, the cart and checkout say so
and the checkout action refuses.

## Tag lifecycle

```
(buy a sticker)  →  QR slots granted
(generate)       →  ACTIVE        owned, scannable, printed into the sticker
                    LOST          owner or admin flagged it; the scan page shows a return banner
                    DEACTIVATED   switched off by the owner, or taken down by a super admin;
                                  the scan page 404s
```

`Tag.takenDownAt` tells the two kinds of DEACTIVATED apart (`canSetTagStatus` in
`src/lib/admin-guards.ts`). The owner can switch their own code off and on again but cannot undo a
takedown; staff can lift a takedown but cannot switch on a code its owner turned off, and a super
admin can turn an owner's switch-off into a takedown.

Owners switch a code off rather than delete it: `deleteTagAction` (which would free the slot and
drop the code's scan history) exists but no page offers it. Staff can issue a replacement QR
without spending a slot but can never move a tag between accounts.

## Privacy & security

- The scan page renders **only** the DTO from `src/lib/public-profile.ts`; each field needs its
  own visibility flag. Scan pages are `noindex`, and logging runs in `after()` so the page is
  never held up.
- Portfolio links are restricted to `http(s)`; theme colours to hex literals; theme text is
  escaped before it reaches the sticker SVG renderer.
- `/media/[id]` authorizes every read; sticker and QR downloads are `private, no-store` because
  they carry the short code.
- Raw scanner IPs are never stored. Login is throttled per email and per IP.
- The caller's address is read from `X-Forwarded-For` **counting back from the end**,
  `TRUSTED_PROXY_HOPS` hops (default 1). Everything further left is the caller's own
  claim: reading the first entry instead let anyone mint a fresh rate-limit bucket per
  request and walk past the login, signup, relay, abuse and scan limits.
- A password change or a role change revokes outstanding JWTs.
- Security headers (CSP, HSTS, frame denial) are set in `next.config.ts`; production refuses to
  boot on missing secrets (`src/lib/env.ts`).

## What's not done yet

- **Live gateway sandbox runs** — needs merchant credentials.
- **Automatic renewal** — plans are renewed by the customer; expiry warnings come from the
  maintenance job.
- **An order-confirmation email** — paying now issues the codes, so the QR reminder that used to
  follow a purchase stays quiet. Nothing else takes its place.
- **SMS** — everything is email; `src/lib/notify/transport.ts` is where a second channel goes.
- **Courier integration** — fulfilment is tracked by hand.
- **Legal review** of the Privacy and Terms pages.

## Deployment (self-hosted)

`Dockerfile` builds a standalone Next.js server; `docker-compose.yml` runs it with Postgres.

```bash
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

Set real `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL` and `IP_HASH_SALT` before
deploying.

**Put a reverse proxy in front** (nginx, Caddy, a load balancer) that terminates TLS and
*appends* the client address to `X-Forwarded-For`, and publish only the proxy — the compose
file's `3000:3000` is for trying it out. Next.js only fills that header itself when the caller
didn't send one, so an app exposed directly can't tell a real address from an invented one:
with the default `TRUSTED_PROXY_HOPS=1` a caller picks their own rate-limit bucket, and with
`0` every visitor shares one, so a single abuser can lock everyone out of signing in.
