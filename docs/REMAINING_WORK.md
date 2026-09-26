# Remaining Work

Reference an item by its number (e.g. "let's do 2.6") to discuss it one at a
time — nothing here is meant to be done in one shot. Finished items are
collapsed to one line each below (full detail, including how each was
verified, lives in `docs/PROGRESS.md`'s dated entries) so this file stays
focused on what's actually still open.

Last updated: 2026-09-26.

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

**2.8 — Pathao integration needs a Store ID + a live test.** The code is
built (`server/src/integrations/pathao.ts`, gated the same way `bkash.ts`
is) but, unlike bKash, has never actually talked to Pathao's API — this now
gates two features, not just one: "Book with Pathao" in each order's Courier
& delivery panel, and the live delivery-fee quote at checkout (added
2026-09-22, see `docs/PROGRESS.md`). Both stay on their existing fallback
(manual courier entry; the flat per-product delivery fee) until this is
done.
- As of 2026-09-22, `server/.env` has `PATHAO_BASE_URL`/`CLIENT_ID`/
  `CLIENT_SECRET`/`USERNAME`/`PASSWORD` filled in with Pathao's published
  sandbox test credentials (`test@pathao.com`/`lovePathao` — publicly known,
  not secret, same idea as bKash's public sandbox app). **Only
  `PATHAO_STORE_ID` is still blank** — `isPathaoConfigured()` requires it, so
  Pathao is still treated as "not configured" until it's set.
- Get it from Pathao's Store API/dashboard once logged into the sandbox with
  those credentials — it's tied to a merchant's own store, not part of the
  shared test credentials, so it can't be filled in from a tutorial.
- Once set, run a real smoke test (city list, then one real booking and one
  delivery-fee quote) — expect to adjust the response parsing in
  `integrations/pathao.ts` if Pathao's actual shapes differ from what's
  documented, same caveat as before.

### Priority 3 — Security & reliability hardening

**3.7 — MongoDB Atlas connection string looks like the free/shared tier**
(`cluster0.8goaquo.mongodb.net`, the default free-tier naming). That tier
caps storage at 512MB and throttles under real concurrent load — fine for
development and even initial launch, but worth upgrading before a real
sales event or if the catalog/order volume grows.

**3.8 — No backup strategy documented** beyond whatever Atlas does by
default on its own tier.

**3.9 — Two-step verification (2FA) is built but not turned on yet.**
TOTP-based, admin/co-admin only, in Settings → "Two-step verification" (see
`docs/ARCHITECTURE.md`'s "Two-step verification" section and
`docs/PROGRESS.md`'s 2026-09-26 entry for the full design). Nothing left to
build — just needs the admin to actually install an authenticator app
(Google Authenticator, Authy, etc.), scan the QR code, and save the 10
backup codes somewhere safe.

**3.10 — Infrastructure-account security hasn't been checked**, separate
from anything in this codebase: (a) MongoDB Atlas Network Access — is it
locked to specific IPs or open to "allow access from anywhere"? The single
most common cause of a leaked database. (b) Account-level 2FA on MongoDB
Atlas, Railway, GitHub, Cloudinary, and the domain registrar — a breach of
any of those logins bypasses the app entirely, 3.9 above included. Raised
2026-09-26 after user asked about site security following a well-known BD
ecommerce breach; see that date's `docs/PROGRESS.md` entries for the
NoSQL-injection and other findings that *were* fixable from inside the
codebase.

### Priority 4 — Smaller, lower-priority polish

**4.5 — Social media ads have platform-specific gaps.** Not done — this
one's genuinely blocked, not skipped by choice: X (Twitter) needs a paid API
tier to actually post; Instagram needs a real public HTTPS domain to even
test (see 1.2); the "4th platform" was mentioned once early on but never
specified, so there's nothing concrete to build.

**4.10 — Catalog has leftover test products with garbage delivery fees.**
Found while debugging a ৳54,576 delivery fee at checkout (2026-09-22) — not
a code bug, just placeholder products (e.g. "dsfa sdfsdfs af", keyboard-mash
names) with keyboard-mash `deliveryFeeInsideCity`/`OutsideCity` values
(455454, 54544, etc.) left over from earlier testing, correctly summed by
the flat-fee fallback. Delete or fix these via `/admin/products` before
relying on real checkout totals. Same products' `weightKg` is also unset
(defaults to 0.5kg in code) — worth setting real weights too once 2.8's
Pathao quote is actually live, since that's what sizes it.

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
- ✅ **2.7** — Bangla translation, whole storefront covered. DB-backed dictionary, `/admin/translations` for editing Bangla text without a code deploy, `<T>`/`t()` wired everywhere: chrome (Navbar/Footer/WhatsApp), homepage (category tiles, trust badges, FAQ), shop/product/cart/checkout, and auth/account pages (login, dashboard, orders, settings) — 303 keys total. Admin panel itself deliberately stays English-only. See `docs/ARCHITECTURE.md`'s "Translations (i18n)" section and `docs/PROGRESS.md`'s 2026-09-21 entries.
- ✅ **Extra, not from the original list** — an admin-only, filtered "Reset analytics data" section on `/admin/analytics` (checkboxes for which event field, an age cutoff, a real count preview before deleting) — added on request, not part of the original audit.
- ✅ **Extra, not from the original list** — fixed two real hydration-mismatch bugs found via user report: the navbar cart-count badge (`useCartStore`) and the language switcher (`useUIStore`), both caused by zustand's `persist` middleware reading `localStorage` synchronously before the server/client first render could agree.
- ✅ **2.9** — Fixed 2026-09-22: sharing any page had no preview image at all (`openGraph.images` unset on the root layout) and no Twitter/X image anywhere, even on product pages. Generated a real branded 1200×630 default (`frontend/public/og-image.png`, via `next/og`'s `ImageResponse` — actual logo, brand colors/fonts, not a mockup) wired into the root layout as the site-wide fallback; the product page now also sets a matching `twitter.images` (falls back to the same default when a product has no photos yet, instead of silently losing the image). See `docs/PROGRESS.md`'s 2026-09-22 entry. `/shop`/`/categories`/`/about`/`/contact` now also set their own `openGraph`/`twitter` blocks (title/description matching the page, still the shared `/og-image.png` since none of these has a natural per-page photo) instead of inheriting the root's generic card — closes **4.11** (2026-09-23).
- ✅ **2.11** — Built 2026-09-22: Google Tag Manager wiring (`frontend/src/lib/gtm.ts`, gated by `NEXT_PUBLIC_GTM_ID`) plus five GA4-shaped `dataLayer` events at the real lifecycle points — `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase` (split cod-vs-bkash so a purchase only counts once payment is actually confirmed). Full design in `docs/ARCHITECTURE.md`'s new "Tracking pixel" section.
  - Container `GTM-K7HP3TNT` is live in production (confirmed via Tag Assistant on `shohojepai.com` — base container loads correctly).
  - A real Meta Business Page (`FACEBOOK_PAGE_ID=1266547903216241`, set in the **local** `server/.env` only so far — not yet added to Railway's production env) and a Meta Pixel (`1895884008258040`) now exist. Inside GTM: a base `Meta Pixel - Base` Custom HTML tag (All Pages trigger) plus four event tags (`ViewContent`/`AddToCart`/`InitiateCheckout`/`Purchase`, Custom HTML, reading `DLV - ecommerce.*` Data Layer Variables at Version 2) wired to matching Custom Event triggers (`view_item`/`add_to_cart`/`begin_checkout`/`purchase`) — user fixed a couple of real setup mistakes caught along the way (a missing `<script>` tag, a `ViewContent` tag wired to the wrong trigger).
  - **Status as of 2026-09-22: configured, not yet confirmed live** — user says "done for this part" but hasn't yet confirmed (a) Tag Sequencing is set so the base pixel always fires before an event tag, and (b) a live Preview-mode walkthrough actually showed all four events firing, before hitting Submit → Publish. Worth a follow-up check.
  - `FACEBOOK_PAGE_ACCESS_TOKEN`/`INSTAGRAM_BUSINESS_ACCOUNT_ID` still blank — the separate `/admin/ads` posting feature needs those (a Facebook Developer app + long-lived Page token), not needed for the pixel/GTM work above.
- ✅ **2.10** — `Organization`/`WebSite` JSON-LD added to the homepage (2026-09-23), same script-tag pattern as `FAQSection`'s existing JSON-LD. Deliberately omitted `sameAs` (Navbar.tsx/Footer.tsx's `SOCIAL_LINKS` are still placeholder URLs like `https://facebook.com`, not the store's real profiles — fabricating `sameAs` would be worse than omitting it) and `potentialAction`/SearchAction (no working search endpoint exists to point one at). Both are easy follow-ups once real social URLs/search exist. Manual submission half: domain verified in Google Search Console via DNS TXT record, sitemap submitted to both Search Console and Bing Webmaster Tools (set up via "Import from Google") — both now confirmed **"Success"** with 18 URLs discovered, Google Discover also surfacing the same 18 pages (2026-09-23).
