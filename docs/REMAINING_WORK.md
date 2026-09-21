# Remaining Work

Reference an item by its number (e.g. "let's do 2.6") to discuss it one at a
time — nothing here is meant to be done in one shot. Finished items are
collapsed to one line each below (full detail, including how each was
verified, lives in `docs/PROGRESS.md`'s dated entries) so this file stays
focused on what's actually still open.

Last updated: 2026-09-21.

---

## Still open

### Priority 1 — Launch blockers

Nothing downstream fully works until these exist, no matter how much other
code gets written. **None left.**

### Priority 2 — Feature gaps customers/you will actually hit

**2.6 — SMS is unconfigured.** Still open — this one genuinely can't be
"finished" by writing code, only by you (or me, with credentials you
provide) setting it up. The opt-in and campaign-sending system built earlier
works end-to-end, but `SMS_API_URL`/`SMS_API_KEY` aren't set, so every SMS
attempt fails. Needs an account with a Bangladeshi bulk-SMS gateway
(BulkSMSBD, MimSMS, SSL Wireless, etc.).

**2.7 — The language switcher doesn't actually translate anything.** It
stores which language you picked, but there's no Bangla translation catalog
behind it — English is the only real language right now.

### Priority 3 — Security & reliability hardening

**3.7 — MongoDB Atlas connection string looks like the free/shared tier**
(`cluster0.8goaquo.mongodb.net`, the default free-tier naming). That tier
caps storage at 512MB and throttles under real concurrent load — fine for
development and even initial launch, but worth upgrading before a real
sales event or if the catalog/order volume grows.

**3.8 — No backup strategy documented** beyond whatever Atlas does by
default on its own tier.

### Priority 4 — Smaller, lower-priority polish

**4.5 — Social media ads have platform-specific gaps.** Not done — this
one's genuinely blocked, not skipped by choice: X (Twitter) needs a paid API
tier to actually post; Instagram needs a real public HTTPS domain to even
test (see 1.2); the "4th platform" was mentioned once early on but never
specified, so there's nothing concrete to build.

---

## Already finished

Each fixed on 2026-09-15 — see `docs/PROGRESS.md`'s entries of that date for
the full design and how it was verified live.

- ✅ **2.1** — Overselling race under concurrent checkout, fixed with a real MongoDB transaction + atomic conditional stock decrement.
- ✅ **2.2** — Customers can now cancel a still-`"pending"` order; cancellation (self-service or admin) restores stock exactly once.
- ✅ **2.3** — `/dashboard` shows admins/coadmins an operational overview (pending orders, revenue, low stock) instead of the customer view.
- ✅ **2.4** — `/admin/messages` inbox for contact-form submissions (read/unread, reply-by-email, delete).
- ✅ **3.1** — Rate limiting on auth endpoints and the public contact form.
- ✅ **3.2** — `helmet` security headers, tuned so uploaded images still load cross-origin.
- ✅ **3.3** — Vitest test suites in both packages (28 backend + 15 frontend tests) and a `.github/workflows/ci.yml`, now actually running — the repo is live at `github.com/shohojepaiofficial-spec/main-app`.
- ✅ **1.2** — Real domain live: frontend on Vercel at `shohojepai.com` (`www` redirects to it), backend on Railway at `api.shohojepai.com`, both with valid SSL. `CLIENT_URL`/`NEXT_PUBLIC_SITE_URL`/`NEXT_PUBLIC_API_URL`/`AUTH_URL` all updated off `localhost`.
- ✅ **1.5** — Admin account created (`npm run promote-admin`) against the production database.
- ✅ **2.5** — Google sign-in fully working end-to-end in production (`AUTH_GOOGLE_ID/SECRET` set, OAuth consent screen configured, `oauth-sync` verified live). Facebook sign-in still has blank `AUTH_FACEBOOK_ID/SECRET` — not done.
- ✅ **3.4** — Error monitoring (`utils/errorMonitoring.ts`), reports to Sentry once `SENTRY_DSN` is set (still blank).
- ✅ **3.5** — Process-crash handling (`uncaughtException`/`unhandledRejection`) paired with a PM2 `ecosystem.config.js` for auto-restart on a self-managed host.
- ✅ **3.6** — Image uploads on Cloudinary, fully live in production (`utils/cloudinary.ts` + `storeUploadedFile()`) — credentials added 2026-09-18, plus two real bugs found and fixed the same week (a tsx/esbuild-specific config-timing bug, and a frontend `FileList`-cleared-before-read bug that silently dropped every selected file). See `docs/PROGRESS.md`'s 2026-09-18/19 entries.
- ✅ **1.4** — Real contact info set in `frontend/src/lib/contact.ts` (phone, address); `server/.env`'s `CONTACT_EMAIL` was already real (`hello@shohojepai.com`).
- ✅ **1.1** — Email is live via Resend's API (`server/src/utils/sendEmail.ts`) — raw SMTP to Namecheap Private Email turned out to be a hard, consistent connection timeout from Railway specifically, not fixable in this codebase, so the whole transport was swapped. Domain verified with Resend (DKIM/SPF-via-CNAME/DMARC records added), `RESEND_API_KEY`/`EMAIL_FROM` set in Railway, and a real "Resend verification email" confirmed delivered in production. Along the way, found and deleted stale Brevo DNS records (unrelated leftover service) and fixed a real bug where the email-verification banner didn't clear until a full page reload.
- ✅ **1.3** — Real bKash payment integration (Tokenized Checkout, URL-based) — decision was Cash on Delivery + bKash only, Nagad/Card dropped outright rather than kept as placeholders. Currently running on bKash's own published sandbox (test-money) credentials; swap `server/.env`'s `BKASH_*` for real merchant credentials to go live, no code changes needed. See `docs/PROGRESS.md`'s 2026-09-20 entry and `docs/ARCHITECTURE.md`'s "Checkout & Orders" section.
- ✅ **Extra, not from the original list** — removed Facebook OAuth sign-in (button, NextAuth provider, `AuthProvider` type/enum on both ends) — it never had real credentials in production, so this was cleanup, not a migration. Facebook *ads* posting and social-share/icon links are unrelated and untouched.
- ✅ **4.1** — Review "verified purchase" badge + admin moderation (delete) via a new `reviews:manage` permission.
- ✅ **4.2** — Wishlist "Move all to cart" (a real move, not a copy).
- ✅ **4.3** — Category matching/grouping is now case-insensitive ("Shoes" and "shoes" merge).
- ✅ **4.4** — `AnalyticsEvent` now has a 180-day MongoDB TTL index for automatic retention.
- ✅ **4.6** — Campaign emails have a one-click, per-recipient unsubscribe link (HMAC-signed, no new secret) and `Campaign.recipients` logs every individual send.
- ✅ **4.7** — `STORE_CITY` duplication fixed: `server/src/utils/store.ts` is now the only place it's defined, served publicly via `GET /api/config`; the frontend fetches it instead of hardcoding a second copy (`frontend/src/lib/seo.ts`'s copy is gone). Picked the runtime-fetch approach over a monorepo/shared-package restructuring, since the two projects deploy independently.
- ✅ **4.8** — Turned out not to need a UX tradeoff after all: `useRequireAuth`'s flash was waiting on NextAuth's `useSession()` even when `useAuthStore` already had the answer (from a fast cookie read, no network call) — fixed to only wait on the slower check when the faster one doesn't know yet (a fresh OAuth login). In-place-login behavior on `/checkout` is unchanged.
- ✅ **4.9** — Real `/privacy` and `/terms` pages, linked from the footer — **worth a lawyer's review before relying on commercially.**
- ✅ **Extra, not from the original list** — an admin-only, filtered "Reset analytics data" section on `/admin/analytics` (checkboxes for which event field, an age cutoff, a real count preview before deleting) — added on request, not part of the original audit.
- ✅ **Extra, not from the original list** — fixed two real hydration-mismatch bugs found via user report: the navbar cart-count badge (`useCartStore`) and the language switcher (`useUIStore`), both caused by zustand's `persist` middleware reading `localStorage` synchronously before the server/client first render could agree.
