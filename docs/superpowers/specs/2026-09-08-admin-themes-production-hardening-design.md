# Admin management, theme ownership and production hardening

Date: 2026-09-08
Status: approved

## Why

Three gaps and one false alarm, found by auditing the running app:

1. An admin cannot manage their own account or anyone else's. `admin/actions.ts`
   refuses to touch any `ADMIN` row and there is no `/admin/profile` route, so
   the seeded `ChangeMe123!` password can only be changed in the database.
2. Themes are ungated. Any customer can apply any `ACTIVE` theme to any tag, so
   buying a themed sticker grants nothing a free account lacks.
3. The app is not production-hardened: no security headers, no error boundary,
   no environment validation, and scan pages are indexable by search engines.
4. The reported payment failure is **not** a code defect. See "Payments" below.

## Theme ownership

A theme belongs to the sticker product that carries it. A customer may apply a
theme if and only if a paid order line references a product with that theme —
plus the default theme, which everyone always has.

`src/lib/theme-access.ts` holds the rule as pure functions over paid lines, so
it is testable without a database. `setTagThemeAction` enforces it; the theme
picker shows unowned themes locked, naming the product that unlocks them.

### Slot attribution

`generateTagAction` currently picks the most recently paid order line
regardless of whether that line's slots are already spent, so a tag can inherit
the wrong product's theme and the wrong order's provenance. Slots become
per-line: a line's capacity is `quantity x product.qrSlots`, its usage is the
count of tags carrying its `orderItemId`, and a new tag binds to the first line
with capacity left.

## The default theme

Identified by the well-known slug `jogajog-emergency` rather than a schema
flag, so no migration is needed. It is seeded as a real `Theme` row and
mirrored by the `DEFAULT_THEME` constant, which remains the fallback when the
row is absent. Every account is entitled to it. It cannot be archived.

- Name: Jogajog Emergency
- Slogan: `🚨 Please scan this QR if it's an emergency`

The slogan comes from the existing `Theme.tagline` column, surfaced through
`ThemeSkin` and rendered under the wordmark on the scan page, so every theme
can carry its own line rather than the default hardcoding one.

## Admin management

- `/admin/profile` — the signed-in admin edits their own name, email and
  password. A password change stamps `passwordChangedAt`, which the existing
  token-freshness check in `session.ts` uses to invalidate outstanding JWTs.
- `/admin/admins` — promote a customer to admin, demote an admin. Guards: an
  admin may not demote or suspend themselves, and the last admin may not be
  demoted.
- `/admin/users/[id]` — edit a customer's name and email for support cases.

The product form gains the missing `qrSlots` field (absent from the form,
actions and validations, so every admin-created product silently granted one
slot) and accepts an image at create time. Its malformed nested `<label>` is
corrected, and the dead `/admin/tags/issued` nav link is removed.

## Payments

Unchanged, and still mocked. The reported failure was environmental: another
Next.js app occupied port 3000, this app bound to 3001, and
`NEXT_PUBLIC_APP_URL` still pointed at 3000 — so the demo gateway's callback
URL reached the other app and settlement never ran. Replayed against the
correct port, the payment settled and the subscription activated on the first
attempt.

To stop that class of failure being silent, `src/lib/env.ts` validates required
variables at boot and fails fast in production, and development warns when the
listening port disagrees with `NEXT_PUBLIC_APP_URL`.

## Hardening

- `noindex` on `/t/[shortCode]`. Emergency profiles must never be crawled.
- Security headers in `next.config.ts`: CSP, HSTS, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- `error.tsx` and `global-error.tsx`.
- `robots.ts`, `sitemap.ts`, `manifest.ts`.

## Testing

Pure logic gets unit tests: theme entitlement, per-line slot attribution, admin
guards, environment validation. UI and route changes are verified against the
running app, ending with a real QR scanned in a browser to confirm the public
portal opens in the expected theme.
