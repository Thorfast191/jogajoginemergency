# Jogajog Emergency — Architecture Gap Analysis

**Date:** 2026-10-18 · **Branch audited:** `feat/roles-stickers-saas-site` @ `8cff68f` (clean tree)
**Mode:** read-only audit. No application code, schema, migration or database state was changed.

---

## 0. Sources and method

### Source documents

| Role | File | How it was read |
|---|---|---|
| Architecture & product skeleton | `docs/superpowers/original plan/1 (7) (1).md` | The Markdown is a lossy OCR of a slide PDF (diagrams garbled). The source PDF `~/Downloads/1 (7) (1).pdf` (10 pages, identical SHA to `1 (7).pdf`) was read **visually, every page**, and is what this report cites as `ARCH p.N`. |
| Marketing plan, launch strategy & product requirements (v1.0, 10 Oct 2026) | `docs/superpowers/original plan/jogajog_emergency_marketing_plan (1).md` | Clean text conversion, read in full. Cited as `MKT §N`. Source PDF exists at `~/Downloads/jogajog_emergency_marketing_plan (1).pdf`. |
| Current-status document | No dedicated file exists. Per instruction, the repo's own Markdown records were used: `README.md` ("What's not done yet" section), `docs/superpowers/specs/*`, `docs/superpowers/plans/*`. | Treated as claims and verified against code. |

`docs/superpowers/original plan/` is currently **untracked** in git.

### Evidence gathered

- Full read of `prisma/schema.prisma`, `prisma/seed.ts`, scan route `src/app/t/[shortCode]/*`, `src/lib/public-profile.ts`, `src/lib/entitlements.ts`, `src/lib/privacy.ts`, `src/lib/payments/settle.ts`, relay/abuse API routes, subscription actions, homepage, nav, footer, demo.
- Targeted inspection of dashboard, admin, auth, proxy, sticker renderer, privacy/contact pages.
- Executed: `npx vitest run` → **33 files, 372 tests passed**. `npx tsc --noEmit` → **exit 0**. `npx eslint` → **no findings**. `npx prisma migrate status` → **18 migrations, schema up to date** (local DB `localhost:5433`).
- **Not executed:** `next build` (would overwrite `.next` used by the running dev server), browser/phone QA, any payment gateway sandbox, SMTP delivery. No DB rows were read.

### Status legend
PASS · PARTIAL · FAIL · CONFLICT · DEFERRED · BLOCKED · UNVERIFIED

---

## A. Executive summary

The application is **well-engineered but built for a different product than the one the approved documents describe.**

The code implements a **general-purpose themed QR-sticker store for "belongings"** (bike, car, luggage, helmet; superhero-archetype themes; portfolio links; lost-item relay). The approved product is a **vehicle-first (car + motorcycle) contact-and-emergency service** whose public scan page separates *Emergency* from *Vehicle needs attention*, shows a prominent **Call 999**, and defaults to minimum public data.

Engineering quality is high where it exists: server-side authorization reads role/status from the DB on every request, tag ownership is checked in every customer action, payment callbacks are re-verified with the provider and amount-matched, settlement is (mostly) idempotent, IPs are hashed, rate limits exist on every public write, scan pages are `noindex`, security headers and env validation are present, unit tests are green.

**Most significant deviations (confirmed in code):**

1. **The scan page has no Call 999 action, no action chooser, and no "not medically verified" caveat.** It renders a lost-property card ("Someone's belongings", "Call to return this"). (P0)
2. **Emergency-contact phone numbers are public by default.** The default `STANDARD` preset sets `contactsPublic = true`, and each contact defaults to `isPublic = true`, so numbers render as `tel:` links. There is no consent capture for health or contact data. (P0)
3. **When a subscription lapses, or the customer presses Cancel, all emergency information disappears from the scan page.** Cancel takes effect immediately, despite the paid period. The marketing plan requires a defined, safe fallback. (P0, needs a founder decision)
4. **There is no Vehicle entity anywhere**: no model, route or UI, and the word "vehicle" occurs zero times in `src/`. There are no structured vehicle-contact presets. (P1)
5. **Public positioning conflicts with the plan.** The hero reads "Lost things find their way home", followed by a 12-item list of use cases (pet collar, laptop, keys…). A Themes nav item is present, there is no motorcycle product, and the dedicated `/products/*`, `/how-it-works`, `/pricing` and `/help` pages are missing. (P1)
6. **The printed sticker carries no human-readable tag ID**, so there is no manual fallback if the QR cannot be scanned. (P0 under MKT §11)
7. **Price:** the code and seed use Tk 499/year, while the architecture shows Tk 490. This is unresolved (founder decision).

**Unverified or blocked:** live payment gateways (README confirms they were never run against a sandbox), real email delivery, behaviour on real phones, and legal review.

---

## B. Current-state architecture (as built)

**Stack (verified):** Next.js 16.3.2 App Router (`src/proxy.ts` replaces middleware), React 19.2, TypeScript, PostgreSQL via Prisma 6.19, Auth.js v5 beta (credentials, JWT sessions), Tailwind v4, Zod 4, `sharp`/`qrcode`/`pdf-lib` for stickers, nodemailer SMTP, Vitest. Docker + docker-compose. **Matches the stated stack**, plus three-hostname split (public / `client.` / `admin.`).

**Domain model (20 models):** `User`, `Account/Session/VerificationToken` (Auth.js), `SubscriptionPlan`, `Subscription`, `Theme`, `Product`, `Order`, `OrderItem`, `Payment`, `Tag`, `ScanEvent`, `RelayMessage`, `AbuseReport`, `EmergencyProfile` (one per **user**, not per vehicle/tag), `ProfileLink`, `EmergencyContact`, `NotificationLog`, `PlatformSetting`, `AdminAuditLog`, `RateLimitCounter`, `MediaAsset`.

**Flow as built:**
```
/shop → /shop/[slug] (pick theme) → /cart (+optional plan) → login required → /checkout
  → gateway (bKash | Nagad | SSLCommerz | DEMO) → /api/payments/callback
  → settlePayment(): re-verify + amount check → Order PAID (+ Subscription ACTIVE if plan in cart)
  → issueTagsForOrder(): Tag rows minted (shortCode, 8 chars / 55-char alphabet)
  → admin prints sticker (QR composited into theme art) → ships (manual)
Scan: /t/[shortCode] → if DEACTIVATED/unknown → generic 404
                     → if owner not entitled → "dormant" card: no info, relay form only
                     → else one card: name/photo/message/medical/contacts/links + relay form
Relay: POST /api/relay/[shortCode] → RelayMessage + email to owner (if SMTP configured)
```

One emergency profile per account is shared by every tag the account owns.

---

## C. Target-state architecture (canonical, derived from ARCH + MKT, preserving valid decisions)

```
QR sticker (printed QR + human-readable tag ID)
  → /t/{code}  (keep existing URL scheme — see D11)
     ├─ Scan landing: vehicle summary (owner-chosen fields) + two buttons
     │    [Emergency]   [Vehicle needs attention / Contact owner]
     ├─ Emergency path: "Call 999" (direct tel:999, top), consented emergency contacts
     │    (relay/masked by default, direct number only with explicit consent),
     │    optional medical info + "not medically verified" caveat, emergency wording,
     │    report/help link
     └─ Vehicle path: preset reasons (blocking access / check parking / minor incident),
          optional note, rate-limited, stored → owner dashboard alert (+ email if configured),
          neutral confirmation ("Request saved") — never "owner has seen it"
  → disabled/unknown code: helpful safe page (999 + what this is + support)
  → expired plan: defined safe fallback (D3), never a silent blank
```

**Domain additions (additive, nullable — no destructive migration):** `Vehicle` (type CAR|MOTORCYCLE, display name, optional registration, per-field visibility) with `Tag.vehicleId`; structured `RelayMessage.reason` + `status` (STORED/NOTIFIED/READ); consent fields/`ConsentAudit`; optional `SupportTicket`. Keep `Tag`, `EmergencyProfile`, payments, themes, three hosts, permissions, audit log.

**Public site:** `/`, `/products/car`, `/products/motorcycle`, `/how-it-works`, `/pricing`, `/demo`, `/privacy`, `/terms`, `/help` (FAQ+support), `/contact`, `/login`, `/register` (alias of `/signup`), `/dashboard/*`, `/admin/*`. Non-vehicle products and themes kept in DB but out of primary navigation (MKT §3 "Keep non-vehicle tags out of the primary navigation").

---

## D. Route-by-route comparison

| Intended (ARCH p.10 / MKT §5) | Existing | Status | Note |
|---|---|---|---|
| `/` | `src/app/page.tsx` | CONFLICT | Exists; lost-property positioning (see §I) |
| `/products` | `/shop` | PARTIAL | Functionally the catalogue; generic |
| `/products/car` | `/shop/car-sticker` | PARTIAL | Generic product page; no placement/materials section |
| `/products/motorcycle` | — | FAIL | No motorcycle product at all (seed has bike, car, luggage, helmet) |
| `/products/helmet` | `/shop/helmet-sticker` | PARTIAL / CONFLICT | ARCH MVP; MKT says placement variant (Decision D6) |
| `/how-it-works` | `/#how-it-works` anchor | PARTIAL | No page; steps are "Pick → Generate → Stick → Someone scans" (lost-item) |
| `/pricing` | `/#pricing` anchor | PARTIAL | No page; no exact renewal/expiry rules |
| `/privacy`, `/terms` | exist | PARTIAL | Plain-language, unreviewed (README); privacy claims dashboard QR deletion that is not offered |
| `/faq` / `/help` | `/#faq` anchor | PARTIAL | No help page; no "cannot scan" route |
| `/contact` | exists | PASS | Shows support email/phone from settings — **only if configured** |
| `/demo` or `/q/{demo}` | `/demo` | PARTIAL | Exists; shows single lost-item card, no emergency/parking flows |
| `/login` | exists | PASS | |
| `/register` | `/signup` | PARTIAL | Name differs; no alias |
| `/dashboard` | exists | PASS | Overview + getting-started checklist |
| `/vehicles`, `/vehicles/:id` | — | FAIL | No vehicle concept |
| `/emergency-profile` | `/dashboard/profile` + `/dashboard/privacy` | PASS (shape) | Defaults/consent fail — see §H |
| `/tags` | `/dashboard/tags` | PASS | |
| `/scans` | overview "Recent scans" + tag detail | PARTIAL | No full scan-history page |
| `/subscription` | `/dashboard/subscription` | PARTIAL | Cancel semantics defect |
| `/settings` (+ Delete) | `/dashboard/settings` | PARTIAL | No account deletion ("contact us") |
| `/scan/:tagId` | `/t/[shortCode]` | PARTIAL | Keep `/t/` (printed codes must not break) |
| `/scan/:tagId/emergency` | — | FAIL | No emergency path |
| `/scan/:tagId/vehicle-contact` | — | FAIL | Relay form is free-text lost-item |
| `/scan/:tagId/message` | relay form inline | PARTIAL | |
| `/admin`, `/admin/customers` (=users), `/admin/tags`, `/admin/payments`, `/admin/analytics` (=scans) | exist | PASS | |
| `/admin/support` | — | FAIL | No support-ticket workflow |
| (extra) `/themes`, `/cart`, `/checkout`, `/about`, portfolio links, `/admin/themes`, `/admin/plans`, `/admin/products` | exist | Not in plan | Keep; demote `/themes` from nav |

---

## E. Requirements inventory & feature gap matrix

ID prefixes: **SCN** scan · **PRV** privacy/consent · **VEH** vehicle · **WEB** public site · **ONB** purchase/onboarding · **DSH** dashboard · **SUB** subscription/payment · **ADM** admin · **SEC** security · **OPS** ops/analytics. Priority P0–P3; Phase refers to §K.

| ID | Source | Requirement / acceptance | Actual (evidence) | Status | Pri | Phase |
|---|---|---|---|---|---|---|
| SCN-01 | MKT §3, §4B-1, §11 | Prominent direct **Call 999** on scan page | None on `/t/[shortCode]` or `PublicProfileCard`; 999 only in site footer/FAQ/terms, which the scan layout doesn't render (`src/components/scan-layout.tsx`) | **FAIL** | P0 | 1 |
| SCN-02 | ARCH p.4, MKT §4C-1, §11 | Action chooser; emergency vs vehicle paths separated; no personal info before choice | Single card shows everything at once (`public-profile-card.tsx`) | **FAIL** | P0 | 1 |
| SCN-03 | ARCH p.4, MKT §4B-3, §12 | "Medical info is user-provided; not medically verified" caveat | Absent (grep: no "verified" string in UI) | **FAIL** | P0 | 1 |
| SCN-04 | MKT §12 | Emergency wording: "call 999 first… contact aid, not an emergency response provider…" | Absent on scan page | **FAIL** | P0 | 1 |
| SCN-05 | MKT §11 | Disabled/unknown token → safe *helpful* page | Generic "We couldn't find that page" 404 (`not-found.tsx`) | PARTIAL | P0 | 1 |
| SCN-06 | MKT §4B-4 | Report misuse / cannot-scan route | "Report this tag" exists (rate-limited); no help/cannot-scan route; abuse `<select>` has no label | PARTIAL | P1 | 1 |
| SCN-07 | MKT §3, §11 | Printed human-readable tag ID as manual fallback | Sticker renderer prints wordmark + tagline only; short code not printed (`src/lib/sticker.ts`) | **FAIL** | P0 | 1 |
| SCN-08 | MKT §4C-4, §11 | Confirmation only after save; never imply owner saw it | Saves before responding (good) but says "sent to the owner — they'll be in touch" (`relay-form.tsx:43`) | PARTIAL | P0 | 1 |
| SCN-09 | MKT §11 | Non-sequential, non-guessable token | nanoid 8 chars, 55-symbol alphabet (~8.4×10¹³) (`short-code.ts`) | PASS | – | – |
| SCN-10 | MKT §11 | Mobile-first, fast first paint, no login, network fallback | No login; logging in `after()`; relay handles network errors; real-device speed UNVERIFIED | PARTIAL/UNVERIFIED | P1 | 4 |
| SCN-11 | MKT §4C-2 | Structured preset vehicle alerts, rate-limited | Free-text message; finder contact **required**; rate-limited per IP+tag | PARTIAL | P1 | 2 |
| SCN-12 | MKT §4C-1 | Don't show emergency page by default for parking intent | Not applicable — no intent split | FAIL | P1 | 1 |
| PRV-01 | MKT §6, §12, §14 | Default to minimum public data; no public numbers by default | Owner phone hidden by default (PASS). **Emergency-contact numbers public by default** (`contactsPublic` default true, `EmergencyContact.isPublic` default true, STANDARD preset); name & photo public by default | **CONFLICT** | P0 | 1 |
| PRV-02 | MKT §11, §12 | Explicit opt-in at collection for health/emergency data; explain purpose/audience/retention | No consent UI or storage (grep: no consent/opt-in) | **FAIL** | P0 | 1 |
| PRV-03 | MKT §11 | Change history for consent-sensitive fields | None; `AdminAuditLog` covers admin actions only | FAIL | P1 | 5 |
| PRV-04 | MKT §12 | Verify contact permission; contact recipient explanation & opt-out | None | FAIL | P2 | 5 |
| PRV-05 | MKT §11 | "Remove optional medical fields by default" | Medical fields private by default (PASS) but always present in form | PARTIAL | P2 | 1 |
| PRV-06 | MKT §12 | Public/private/internal separated; API responses tested for leakage | `buildPublicProfileView` DTO + `public-profile.test.ts` | PASS | – | – |
| PRV-07 | MKT §12 | Avoid precise scanner location | Approx city/region/country from headers; IP hashed | PASS | – | – |
| PRV-08 | MKT §12, ARCH p.2 | Data deletion procedure; settings/delete | No self-serve account deletion; privacy page says "contact us"; privacy page claims "delete a QR code… from your dashboard" but no page offers it (README "Tag lifecycle") | PARTIAL + claim CONFLICT | P1 | 5 |
| PRV-09 | MKT §12 | Retention defined | Notifications pruned at 90 days; ScanEvent and RelayMessage (finder phone/email) kept indefinitely | PARTIAL | P2 | 5 |
| VEH-01 | ARCH p.2,5,10; MKT §11 entities | Vehicle entity (type, optional registration/display), tag→vehicle link | **No Vehicle model**; tag has free-text `internalLabel` only | **FAIL** | P1 | 2 |
| VEH-02 | ARCH p.5 | Dashboard "My vehicles" with QR status per vehicle | No | FAIL | P1 | 2 |
| VEH-03 | ARCH p.4 | Scan landing shows vehicle summary (model/colour/area) per owner choice | No | FAIL | P1 | 2 |
| VEH-04 | MKT §12 | Transfer flow for sold vehicle; rotate token on compromise | No transfer (by design, staff "can never move a tag"); admin replacement QR exists (effectively rotation) | PARTIAL | P2 | 4 |
| WEB-01 | MKT §5, §6 | Vehicle-first hero "Your vehicle. Your emergency contacts. One scan." CTAs "Get your QR tag" / "Try the demo" | Hero "Lost things find their way home"; "QR stickers for bikes, helmets, bags & cars" | **CONFLICT** | P1 | 3 |
| WEB-02 | MKT §5 conversion rule, §3 boundary | No broad lost-and-found list; non-vehicle out of primary nav | 12-item use-case strip incl. pet collar, laptop, keys; luggage product; Themes in nav | **CONFLICT** | P1 | 3 |
| WEB-03 | MKT §5 | Homepage order: hero → two scenarios (accident / blocking) → how it works → trust → pricing+FAQ → demo+support | Hero → steps → demo → stickers → pricing → privacy → use cases → FAQ; no two-scenario section | PARTIAL | P1 | 3 |
| WEB-04 | ARCH p.10, MKT §5 | `/products/car`, `/products/motorcycle` with placement/materials/included | Missing (see §D) | FAIL | P1 | 3 |
| WEB-05 | MKT §5 | `/how-it-works`, `/pricing` (exact renewal rules), `/help` | Anchors only | PARTIAL | P1 | 3 |
| WEB-06 | MKT §6 | Claims-to-avoid respected | No "prevents accidents"/"police verified"; but "You get an alert straight away" (email, SMTP-dependent); "scans answered" stat; helmet copy "In a crash, a responder can scan it" acceptable | PARTIAL | P1 | 3 |
| WEB-07 | MKT §5 | Demo lets visitors try emergency **and** parking flows | Single static card | PARTIAL | P1 | 3 |
| WEB-08 | MKT §12 | Published support + privacy contact before launch | From `PlatformSetting`; blank unless super admin fills it — UNVERIFIED in prod | UNVERIFIED | P1 | 5 |
| ONB-01 | MKT §4A, ARCH p.6 | Choose → clear total → register/verify owner contact → profile → activate & test scan → install guide | Shop → cart → login → pay → codes minted. No contact verification (`emailVerified` unused), no test-scan step, no placement guide; profile is a checklist item | PARTIAL | P1 | 4 |
| ONB-02 | ARCH p.6 | Checkout shows sticker + annual service = total | Cart offers plan as optional add-on; total shown | PASS | – | – |
| ONB-03 | MKT §13 | Activation = completed profile + successful owner test scan | Not tracked | FAIL | P2 | 4 |
| DSH-01 | MKT §3 | Create/edit vehicle, manage contacts, choose public fields, view scans/requests, disable tag | Contacts/fields/messages/disable PASS; vehicle FAIL; full scan history PARTIAL | PARTIAL | P1 | 2 |
| DSH-02 | MKT §3 | Changes publish without replacing sticker | Profile is read live on each scan (`force-dynamic`) | PASS | – | – |
| DSH-03 | MKT §3 | Owner receives in-dashboard alert | `/dashboard/messages` + overview list; no unread/read state | PARTIAL | P1 | 2 |
| SUB-01 | MKT §7, §14 | One consistent annual price | Seed Tk 499/12 mo, rendered from DB everywhere (consistent in-app); ARCH shows Tk 490 | **BLOCKED** (D1) | P0 | 3 |
| SUB-02 | MKT §7, §12, §14 | Safe, defined post-expiry state; gate premium features, don't hide whole page | `LAPSED_BEHAVIOUR="RELAY_ONLY"`: every field incl. contacts/medical hidden; relay only | **CONFLICT** (D3) | P0 | 1 |
| SUB-03 | MKT §3 | Plan state, expiry, renewal, what remains available; no hidden state | Shows "runs until"; does not state what happens at expiry | PARTIAL | P1 | 1 |
| SUB-04 | — (integrity) | Cancel keeps paid period | `cancelSubscriptionAction` sets `CANCELED` → `entitledWhere` excludes it → **page goes dormant immediately**, no confirmation copy (`dashboard/subscription/actions.ts:116`) | **FAIL** | P0 | 1 |
| SUB-05 | MKT §11 | Production confirmation from verified provider callback | `settlePayment` re-verifies + amount/currency match; DEMO refused when `PAYMENT_MODE=live` | PASS (code) | – | – |
| SUB-06 | — (idempotency) | No duplicate entitlement grants | Duplicate-success guard is read *before* the transaction and payment update is unconditional; two concurrent successful callbacks for an order-with-plan could each run `activateSubscription`, extending twice | UNVERIFIED (plausible race) | P1 | 5 |
| SUB-07 | MKT §11 | Real gateways working | Never run against sandbox (README) | **BLOCKED** | P1 | 6 |
| SUB-08 | MKT §7 | Replacement pricing/policy | Admin replacement QR free; policy undefined | BLOCKED (D2) | P2 | – |
| ADM-01 | ARCH p.8, MKT §11 | Restricted admin; role-based | Separate host, `permissions.ts`, DB-checked roles, guards, tests | PASS | – | – |
| ADM-02 | MKT §11 | Audit log for profile/tag/admin changes | Admin changes PASS; customer profile/consent changes not audited | PARTIAL | P1 | 5 |
| ADM-03 | ARCH p.2,8; MKT §11 | Support tickets / support workflow | None (`/admin/support` absent) | FAIL | P2 | 5 |
| ADM-04 | MKT §11 | Abuse-report queue | `/admin/abuse-reports` with status workflow | PASS | – | – |
| ADM-05 | MKT §11 | Subscription override records | Extend/comp/cancel audited | PASS | – | – |
| ADM-06 | ARCH p.8 | Ops overview: accounts, active tags, renewals due, open support, 24h scans, emergency actions | Overview tiles + 30-day scans + needs-attention; no "emergency actions" metric (no chooser) | PARTIAL | P2 | 5 |
| SEC-01 | MKT §11 | Secure passwords, sessions, rate-limited login | bcrypt(10), JWT with revocation on password/role change, login throttled per email+IP | PASS | – | – |
| SEC-02 | MKT §11 | CSRF where applicable | Server Actions (origin-checked by Next) + Auth.js CSRF cookie (renamed `__Secure-`) | PASS | – | – |
| SEC-03 | MKT §11 | Authorization on every vehicle/tag op | `findFirst({id, userId})` pattern in tag/profile actions; media reads authorized | PASS (spot-checked) | – | – |
| SEC-04 | ARCH p.7 | CAPTCHA / anti-automation on public writes | Rate limits only | PARTIAL | P2 | 5 |
| SEC-05 | — | IP trust model | `TRUSTED_PROXY_HOPS`, counts from right; documented | PASS | – | – |
| OPS-01 | MKT §11, §13 | Track scan event, selected action, request outcome, activation, support events | Scan events only | PARTIAL | P2 | 5 |
| OPS-02 | MKT §4C-3, §14 | Notification channel labelled accurately; no SMS/WhatsApp claims | Email + dashboard; legacy SMS plans retired in seed; FAQ says "reaches you by email" | PASS (copy) / UNVERIFIED (delivery) | P1 | 6 |
| OPS-03 | — | Automated tests | 372 unit tests pass; **no integration/E2E tests** of scan, relay, checkout | PARTIAL | P1 | all |
| OPS-04 | MKT §10 | Incident-response process | Not documented in repo | FAIL | P2 | 5 |
| DEF-* | ARCH p.9, MKT §3 | Masked call/SMS relay, richer analytics, helmet specialization, lost-item/pet/bag, fleet, GPS, crash detection | Not built (lost-item **is** built — see WEB-02) | DEFERRED | P3 | – |

---

## F. Customer journey analysis

**Journey A: buy and activate (MKT §4A).** Choose ✅ (generic) → total price ✅ → **login required before checkout** (`checkout/page.tsx:23`) → pay ✅ → codes auto-minted ✅ → profile (a checklist item, not part of the flow) → **no test scan step** ❌ → **no placement guide** ❌ → physical delivery is manual, with no tracking ⚠️.
- *Dead end:* a buyer who skips the plan add-on gets a sticker whose scan shows nothing about them. The dashboard does explain this, but the purchase flow hides the cost of skipping it.
- *Inconsistent state:* a paid order with a lapsed or absent plan yields a working sticker that is effectively blank (D3).

**Journey B: accident (MKT §4B).** Scan → one card with name/photo/message → medical (if opted in) → contacts with direct numbers (by default) → relay. **No 999, no caveat, no emergency wording.** If the owner's plan lapsed, the bystander sees "Someone's belongings… you can still send its owner a message": unsafe at the moment it matters.

**Journey C: vehicle blocking access (MKT §4C).** No "Vehicle needs attention" choice. The scanner sees the emergency card, then types a free-text message and **must** provide their own phone/email. The confirmation overpromises.

**Subscription.** Renew = new gateway payment that extends from the current end ✅. Cancel = immediate loss ❌. Expiry warnings at 7/1/0 days via the maintenance cron ✅ (needs SMTP and cron configured — UNVERIFIED).

**Account management.** Change name/email/password ✅. Scan-email toggle ✅. Self-serve deletion ❌. Tag on/off ✅. Lost flag ✅.

---

## G. Database and domain-model analysis

| Gap | Recommendation (all additive, nullable, backward-compatible) |
|---|---|
| No `Vehicle` | New `Vehicle { id, userId, type CAR\|MOTORCYCLE\|OTHER, displayName, make?, colour?, registration?, *Public flags }`; `Tag.vehicleId String?` (SetNull). Existing tags stay valid with null. |
| `RelayMessage` lacks intent/status | Add `kind` (EMERGENCY\|VEHICLE\|GENERAL, default GENERAL), `reason String?`, `readAt DateTime?`; make `finderContact` optional for presets via new migration (`DROP NOT NULL` is non-destructive). |
| No consent record | Add `EmergencyProfile.consentAt DateTime?`, `consentVersion String?`; `ConsentAudit { userId, field, from, to, at }` or reuse an audit table with `actorType`. |
| Defaults expose contacts | Change **column defaults** for new rows only (`contactsPublic`, `EmergencyContact.isPublic`); **do not** rewrite existing users' choices without decision D4. |
| One profile per user | Acceptable for MVP (ARCH has one "Emergency profile" per account). Keep. |
| No support tickets | Optional `SupportTicket` (Phase 5) or document an email-based process instead (D10). |
| Retention | Scheduled pruning for `RelayMessage.finderContact`/`ScanEvent` via existing `/api/maintenance` (no schema change). |

All 18 migrations are applied locally. No migration requires dropping or rewriting data.

---

## H. Security and privacy findings (prioritized)

| # | Severity | Finding | Evidence | Remediation criterion |
|---|---|---|---|---|
| H1 | P0 | Emergency-contact numbers published by default | schema defaults + `PRESET_FLAGS.STANDARD` | New profile renders zero contact numbers until owner explicitly enables per contact with consent; unit test on DTO |
| H2 | P0 | No consent capture for health/contact data | grep | Saving medical fields or making any contact public requires an explicit checkbox; timestamp stored; test |
| H3 | P0 | Unsafe emergency UX (no 999 / caveat) | §E SCN-01..04 | 999 `tel:` link above the fold on every scan state incl. dormant and 404-for-tag; caveat adjacent to medical info |
| H4 | P0 | Cancel/lapse removes emergency info | SUB-02/04 | Per D3; cancel keeps entitlement to period end; test on `entitledWhere` + action |
| H5 | P1 | Possible double entitlement on concurrent callbacks | `settle.ts:71,113-160` | Conditional `updateMany({where:{id, status:{not:"SUCCEEDED"}}})` inside tx; abort if count 0; concurrency test |
| H6 | P1 | Indefinite retention of finder contact details | no pruning | Retention period defined and enforced by maintenance job |
| H7 | P2 | No CAPTCHA/anti-automation beyond rate limits | ARCH p.7 | Decide; at minimum honeypot + rate limit on relay/abuse |
| H8 | P2 | Theme names resembling well-known characters ("Web Slinger", "Night Guardian", "Speedster") | `prisma/seed.ts` | Counsel review; rename or archive before marketing |
| — | Legal | PDPA 2026 (Act 63), privacy/terms text | README | **Qualified Bangladesh counsel review required.** This audit is not legal advice. |

Confirmed strengths: DB-backed auth on every request, JWT revocation, ownership checks, DTO-only scan rendering, hashed IPs, `noindex` scan pages, safe link schemes, CSP/HSTS, fail-fast env, amount-verified payments, idempotent orders.

---

## I. Marketing-claim vs capability matrix

| Public claim (where) | Reality | Verdict |
|---|---|---|
| "Lost things find their way home" (hero) | Off-strategy per MKT §5/§6 | Replace |
| "Your number is never shown" (`page.tsx:26`) | True for owner phone by default; **emergency contacts' numbers shown by default** | Misleading → fix defaults |
| "You get an alert straight away" (`page.tsx:22`) | Email, only if SMTP configured; throttled 1/10 min/tag | Soften ("by email and in your dashboard") |
| "Change is live immediately" (FAQ) | True | OK |
| "finders can still send you a message, so a lost item can still come home" (FAQ on plans) | True, but hides that emergency info disappears | Rewrite after D3 |
| "Delete a QR code… from your dashboard" (privacy) | Not offered in UI | Fix copy or ship feature |
| "Message was sent to the owner — they'll be in touch" (scan) | Stored; delivery not confirmed; reply not guaranteed | Replace with neutral "Request saved" |
| "1 min to set up your page" / "scans answered" (stats) | Unmeasured | Remove or substantiate |
| "Pay with bKash, Nagad, or card" (FAQ) | Gateways untested live | Hold until verified |
| No "prevents accidents"/"police verified"/"tracks" claims | Correct | PASS |

---

## J. Unresolved decisions (founder approval needed)

| # | Decision | Options | Recommendation |
|---|---|---|---|
| D1 | Annual price | Tk 490 (ARCH, founder's original) · Tk 499 (current code/seed) | Pick one; it's one `SubscriptionPlan` row edited via `/admin/plans` (audited). No code change needed. |
| D2 | Sticker price & replacement policy | Keep Tk 299–349 · reprice after landed cost | Keep the current prices as provisional, labelled internally; decide the replacement policy (free first replacement?) |
| D3 | Post-expiry / cancelled scan page | (a) current: relay only, all info hidden · (b) **999 + emergency contacts via relay + "plan expired" banner; medical/name/photo/portfolio gated** · (c) everything stays visible | **(b)**, matching MKT §7's recommended baseline; counsel to review |
| D4 | Privacy defaults, and what happens to existing profiles | (a) new defaults apply to new profiles only · (b) also reset existing profiles to private and notify owners | New profile = MINIMAL (message only; contacts via relay). For existing users, prefer (a) plus a dashboard prompt to review |
| D5 | Non-vehicle catalogue (luggage, bike) and character themes | Archive · hide from nav but keep sellable · keep | Hide from primary nav and the homepage; keep the products and themes in the DB (MKT §3). Rename or archive the archetype themes after counsel review |
| D6 | Helmet in MVP | ARCH p.9: MVP · MKT §3: placement variant | Present it as a motorcycle placement option on `/products/motorcycle`, not a separate category |
| D7 | Vehicle fields shown publicly | Registration number public? | Default off; show type + colour + owner-chosen nickname |
| D8 | Cancel semantics | Immediate · end of period | End of period (fixes SUB-04) |
| D9 | Alert channels to advertise | Dashboard only · dashboard + email | Dashboard + email, but only once SMTP delivery is verified in production |
| D10 | Support & incident ownership | Ticket system · email/WhatsApp + documented process | Documented process plus published contacts for the pilot; tickets in Phase 5 |
| D11 | Scan URL scheme | Keep `/t/{code}` · move to `/scan/{id}` | **Keep `/t/`.** Printed stickers must never break; implement the chooser as in-page state or sub-paths under `/t/` |
| D12 | Register before or after payment | Current: login before checkout | Keep (ownership is established before payment) |

---

## K. Implementation roadmap (dependency-ordered; each phase independently shippable)

**Phase 1: scan-page safety and privacy defaults (P0).** *Recommended first.*
- Covers: SCN-01–08 and 12, PRV-01/02/05, SUB-02/03/04 (per D3, D4, D8).
- Files: `src/app/t/[shortCode]/page.tsx`, `relay-form.tsx`, `report-abuse-link.tsx`, `src/components/public-profile-card.tsx`, `scan-layout.tsx`, `src/lib/public-profile.ts`, `src/lib/entitlements.ts`, `src/lib/privacy.ts`, `src/app/not-found.tsx` (or a tag-specific not-found), `src/lib/sticker.ts` (print the short code), `src/app/dashboard/profile/*`, `src/app/dashboard/subscription/{actions,page}.tsx`, `src/lib/demo-profile.ts`.
- Migration: one additive migration for consent columns and changed column defaults. No data rewrite.
- Tests: DTO tests (default profile exposes no numbers; lapsed view per D3 always includes 999 and the fallback); a cancel-keeps-period test; a sticker decode test that asserts the code text is present.
- Rollback: revert the commit; the additive migration can stay in place.
- Done when: every scan state shows 999 and the emergency wording, the chooser separates the two paths, the default profile is minimal, and consent is stored.

**Phase 2: vehicle domain and structured owner alerts (P1).** VEH-01–03, SCN-11, DSH-01/03. New `Vehicle` model, `Tag.vehicleId`, `RelayMessage.kind/reason/readAt`. Dashboard `/dashboard/vehicles`, preset alert form, unread state. Additive migration only.

**Phase 3: public-site realignment (P1).** WEB-01–07, SUB-01 (D1, D5, D6). Vehicle-first homepage in the MKT §5 order, `/products/car`, `/products/motorcycle`, `/how-it-works`, `/pricing`, `/help`, `/register` alias. Nav changes and claims fixes. Hide non-vehicle products by setting their status (no deletes). Update the demo to show both flows.

**Phase 4: onboarding and activation (P1/P2).** ONB-01/03, VEH-04, SCN-10. Email verification, a test-scan step, placement guide, activation tracking, a token-rotation path for owners, real-phone QA.

**Phase 5: operations, trust and integrity (P1/P2).** SUB-06 race fix, PRV-03/04/08/09, ADM-02/03/06, SEC-04, OPS-01/04. Consent audit, self-serve deletion, retention pruning, support workflow, analytics events, CAPTCHA/honeypot, incident runbook, integration tests.

**Phase 6: external verification (blocked).** SUB-07 gateway sandbox runs (needs merchant credentials), SMTP production delivery, counsel review of privacy/terms/themes.

---

## L. Regression and acceptance-test plan

| Area | Proof |
|---|---|
| Scan safety | Unit: `buildPublicProfileView` for entitled, lapsed, cancelled, no-profile and lost states. Render test: a 999 link is present in each. Manual: iOS Safari and Android Chrome scan of a printed sticker |
| Privacy defaults | Unit: a fresh profile's DTO contains no phone or email. Test that a contact becomes public only with consent |
| Relay | Route test: preset accepted without finder contact, rate limit enforced, 404 on DEACTIVATED, response wording |
| Subscription | Unit: cancel leaves `entitledWhere` true until `currentPeriodEnd`. Settlement concurrency test (two parallel settles yield one extension) |
| Ownership | Existing pattern tests, plus a new one: another user's vehicle or tag id is rejected in every new action |
| Site | Link check over the nav/footer routes, all returning 200. Grep test that no forbidden claims appear ("prevents accidents", "police verified", "guarantee") |
| Regression | `npx vitest run` (currently 372/372), `npx tsc --noEmit`, `npx eslint`, `next build` (run in a separate checkout or with the dev server stopped), `prisma migrate status` |

---

*Every status above is backed by the cited file. Items marked UNVERIFIED or BLOCKED have not been exercised end to end. No claim of launch readiness is made.*


---

## M. Decision record (founder, 2026-10-18)

| # | Decision |
|---|---|
| D1 | Annual plan **Tk 499/year**. Already the price in seed and DB; no change needed. |
| D3 | **Active plan:** the scan page shows the emergency information the owner set public (contacts, blood group, allergies, notes, message, name/photo). **Expired / no plan:** the page stays hidden as before (`LAPSED_BEHAVIOUR = "RELAY_ONLY"`), plus a Call 999 button and the message relay. This deliberately differs from MKT §7's suggested fallback; the founder chose it. |
| D4 | New profiles start private (MINIMAL). Existing profiles are left as they are, and their owners get a prompt to review and confirm. |
| D5 | Luggage, bags and suitcases stay a supported use, so they are **not** hidden. Phase 3 positioning must keep vehicles first while still including them. |
| D8 | A customer's cancellation takes effect at the end of the paid period. |

## N. Phase 1: implemented 2026-10-18

| Req | Change | Evidence |
|---|---|---|
| SCN-01/04 | Call 999 bar and emergency wording on every scan state | `scan-layout.tsx`. Playwright: one `tel:999` link on live, lapsed and unknown-code pages; zero on the demo (not dialable there) |
| SCN-02/12 | Emergency vs Contact-the-owner chooser and separate sections | `public-profile-card.tsx` |
| SCN-03 | "Not medically verified" caveat under medical details | same; Playwright check |
| SCN-05 | Helpful 404 page for unknown or switched-off codes (still returns 404 status) | `src/app/t/[shortCode]/not-found.tsx` |
| SCN-06 | Labelled abuse-report reason; added "wrong or outdated information" | `report-abuse-link.tsx` |
| SCN-07 | Tag ID printed under the QR; the QR still decodes | `sticker.ts`, `sticker-layout.ts`; tests in `sticker-render.test.ts` and `sticker-layout.test.ts` |
| SCN-08 | Confirmation says the message is saved; no promise that the owner has read it | `relay-form.tsx`; Playwright |
| SCN-11 (part) | One-tap reasons that prefill the message (no schema change) | `relay-form.tsx` |
| PRV-01 | New profiles MINIMAL; schema defaults private for new rows | `privacy.ts` (`DEFAULT_PRESET`), `profile.ts`, migration `20261018120000_*` |
| PRV-02 | Consent required before publishing contacts, medical details or a phone number; `consentAt`/`consentVersion` stored; review prompt for existing owners | `privacy/actions.ts`, `privacy-controls.tsx`; unit tests; Playwright |
| SUB-04 | Cancel at period end, plus "Keep my plan"; payment or a staff grant clears the flag; admin shows "won't renew" | `subscription/actions.ts`, `settle.ts`, `subscription-periods.ts` (`endsWithoutRenewal`); Playwright: page still live after cancel |

**Migration** `20261018120000_private_defaults_consent_cancel_at_period_end`: three added columns and four column defaults changed. No existing row was modified. Applied locally with `prisma migrate deploy`. **It must be run on production at deploy time.**

**Verification:** vitest 392/392 passed · `tsc --noEmit` clean · ESLint clean · `next build` succeeded · Playwright on the local dev server (390 px and 1200 px viewports).

**Still open from Phase 1's scope:** relay messages are free text with no `kind`/`readAt` (Phase 2). No real-phone QA yet. Consent wording needs counsel review.
