# Jogajog Emergency

QR-sticker-based emergency contact / lost-item recovery system. Subscribers get unique QR
tags, stick them on belongings, and anyone who finds the item scans the code to reach the
owner through a privacy-preserving relay — no app, no login, no exposed phone number.

## Stack

Next.js (App Router) + PostgreSQL + Prisma + Auth.js (credentials, JWT sessions) + Tailwind.
Payments run through a `DEMO` provider stub (see below) pending a real Bangladesh gateway
integration.

## Local setup

1. Have a PostgreSQL 14+ instance available and set `DATABASE_URL` in `.env` (copy
   `.env.example` and fill it in). If you don't have Postgres, `docker compose up -d postgres`
   spins one up using the credentials already wired into `docker-compose.yml`.
2. Install dependencies: `npm install`
3. Apply the schema: `npm run db:migrate`
4. Seed subscription plans + an admin account: `npm run db:seed`
   (creates `admin@jogajog.app` / `ChangeMe123!` — change this password immediately)
5. Run the app: `npm run dev`

## Project layout

- `prisma/schema.prisma` — data model (User, Tag, Item, ScanEvent, RelayMessage,
  Subscription/Payment, AbuseReport)
- `src/app/(marketing)` (`/`, `/pricing`) — public marketing pages
- `src/app/signup`, `src/app/login` — auth
- `src/app/t/[shortCode]` — the public, no-login scan page a finder lands on
- `src/app/dashboard/*` — **customer area** (subscription-based product user): overview, My
  Items, My Tags (configure tags assigned to you — attach item, status, contact mode,
  public page), Messages, Billing, Settings. Customers never generate raw tag inventory.
- `src/app/admin/*` — **admin area** (platform authority, role-based, no subscription
  required): overview, Tag Inventory (generate QR inventory, assign tags to customers),
  Issued Tags, Users, Subscriptions, Payments, Scan Activity, Abuse Reports
- `src/lib/session.ts` — `requireActiveUser` / `getAdmin` / `requireAdmin` /
  `getCustomer` / `requireCustomer`; every server action and route handler authorizes
  through these
- `src/lib/` — Prisma client, Auth.js config, QR generation, short-code generation, IP
  hashing, in-memory rate limiter, notification stub, zod validation schemas

## Tag lifecycle

An admin generates inventory tags (`userId = null`, `status = UNASSIGNED`). An admin then
assigns an unassigned tag to a customer — this checks the customer has an active
subscription and is under their plan's `maxTags`, and flips the tag to `userId = customer`,
`status = ACTIVE`. The customer manages their own tags from `/dashboard/tags` (mark `LOST`,
`DEACTIVATED`, attach an item, set the public page). An admin can release a tag back to
inventory (`status = UNASSIGNED`), which clears the owner, the attached item and all
owner-authored public config. Customer permissions come from the subscription; admin
permissions come from role and never require a subscription.

## Privacy & abuse-prevention notes

- The public scan page never renders a phone number or email by default. Owners choose
  between a **relay** (finder leaves a message + contact, the platform would forward it to
  the owner's real contact) or a **masked click-to-call number** they control — never their
  raw number.
- Raw finder IPs are never stored; `src/lib/hash.ts` salts and hashes them before writing a
  `ScanEvent`.
- `src/lib/rate-limit.ts` rate-limits scan views, relay message sends, and abuse reports per
  IP (and per tag) to slow down scraping the short-code space or spamming an owner. It's an
  in-memory limiter — correct for a single-process VPS deployment; swap it for a shared store
  (Redis/Postgres) before running multiple app instances behind a load balancer.
- Short codes are generated from an 8-character, unambiguous 56-character alphabet
  (`src/lib/short-code.ts`) — ~2×10^14 possible codes, so guessing a live tag isn't practical
  even combined with the rate limiter.

## What's stubbed / next steps

- **Payments**: `Subscription`/`Payment` records use `provider: DEMO` and are marked
  succeeded immediately on signup — no money moves. Swap in SSLCommerz or bKash by
  implementing their checkout/webhook flow and writing to the same `Payment` model
  (`src/app/signup/actions.ts`, `src/app/dashboard/billing/actions.ts`).
- **Notifications**: `src/lib/notify.ts` currently just logs scan/relay events to the server
  console instead of sending email/SMS. Wire in a real provider (SES, a transactional email
  API, or a local SMS gateway) there.
- **Scan geolocation**: `ScanEvent.approxCity/Region/Country` exist in the schema but nothing
  populates them yet — hook up an IP geolocation lookup (with consent/privacy review) in
  `src/app/t/[shortCode]/page.tsx` if you want that.

## Deployment (self-hosted VPS)

`Dockerfile` builds a standalone Next.js server; `docker-compose.yml` runs it alongside
Postgres. On the VPS:

```bash
docker compose up -d --build
docker compose exec app npx prisma migrate deploy
docker compose exec app npm run db:seed
```

Set real values for `AUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_APP_URL`, and
`IP_HASH_SALT` in `.env` before deploying — the checked-in `.env.example` values are for
local development only.
