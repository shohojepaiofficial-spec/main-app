# Remaining Work

Reference an item by its number (e.g. "let's do 2.6") to discuss it one at a
time — nothing here is meant to be done in one shot. Finished items are
collapsed to one line each below (full detail, including how each was
verified, lives in `docs/PROGRESS.md`'s dated entries) so this file stays
focused on what's actually still open.

Last updated: 2026-10-05.

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

**2.8 — Pathao: live quotes verified; production env + first booking left.**
On 2026-09-30 the local `server/.env` was switched to the real merchant
account (live `https://api-hermes.pathao.com`, Store ID `471237` = "Shohoje
Pai", Lamabazar) and checked live: login, store list, city/zone lists and
price quotes all work (Sylhet 60, Dhaka 110, most other districts 120 Tk
for 0.5kg). Left:
- ~~Add the six `PATHAO_*` values in Railway~~ — done by the user
  2026-09-30. Still to confirm on the live site: checkout shows a Pathao
  quote (e.g. Dhaka 110 Tk) instead of the flat fee. If it doesn't, check
  that Railway's password has *no* quotes around it (the quotes in `.env`
  are only there because it contains a `#`). **2026-10-05:** Railway's
  password was missing its trailing `#` (logs: "The user credentials were
  incorrect"); user fixed it. Live quote confirmed working on the live
  checkout the same day (Gaibandha, 1kg: "Pathao live rate ৳145").
- **First real booking** via "Book with Pathao" on a real order — never
  exercised yet (it creates a real pickup, so do it on a genuine order).
- 22 of 494 upazilas (mostly Rangamati) have no matching Pathao zone and
  keep the flat fee.

**2.12 — Product variants: passed end-to-end on the live site (2026-10-05).**
Size (M/L) × Color (Black/White) product → shop shows "৳500 – ৳550" →
picking options updates price and stock → two variants as separate cart
lines → COD order #47E751 (Pathao live rate ৳145) → Manage Orders and the
packing slip list both variants → variant stock 5→4 → cancel → back to 5 →
product deleted. Nothing left.

**2.13 — Click-throughs left** (done 2026-10-05: product/user filter bars,
"Discard your changes?" on Esc, backdrop and ✕):
- Users pagination — only 6 users, so a second page never appears yet.
- Posting, editing and removing a store reply on `/admin/reviews` — needs
  a real product with a review first.
- Login modal inside the Facebook/Instagram app (2026-10-02): share a
  site link in Messenger, open it, open Sign in — Google button should be
  replaced by the "open in browser" notice; "Open in Chrome" should work
  on Android.

**2.14 — bKash hidden until real merchant credentials exist.** Fixed
2026-10-05: in production bKash is offered (and accepted) only when
`BKASH_*` is set to a non-sandbox URL; checkout reads the list from
`GET /api/config`. User has applied for a bKash merchant account — once
approved, put the live `BKASH_*` values in Railway and bKash reappears at
checkout within a minute, no code change.

**2.15 — Google OAuth consent screen: confirmed "In production"** (User
type: External) on 2026-10-05, so any Google account can sign in. The
earlier "Testing" note is out of date. If Google sign-in still fails
sometimes, check for the "Google sign-in didn't finish" toast (backend
`oauth-sync` failed → Railway logs) or an in-app browser (FB/IG).

### Priority 3 — Security & reliability hardening

**3.7 — MongoDB Atlas connection string looks like the free/shared tier**
(`cluster0.8goaquo.mongodb.net`, the default free-tier naming). That tier
caps storage at 512MB and throttles under real concurrent load — fine for
development and even initial launch, but worth upgrading before a real
sales event or if the catalog/order volume grows.

**3.8 — No backup strategy documented** beyond whatever Atlas does by
default on its own tier.

**3.9 — Two-step verification (2FA): turned on for the admin account
(2026-10-05, user confirmed).** Any future co-admin should turn it on too
(Settings → "Two-step verification"). Keep the 10 backup codes offline.

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

**3.12 — `npm audit` on `server/` shows 2 high-severity findings**, both
via `pm2`'s `js-yaml` dependency (the process manager, never touches user
input). Low real risk; worth making `npm audit` a periodic habit rather
than a one-time check.

### Priority 4 — Smaller, lower-priority polish

**4.5 — Social media ads: Facebook + Instagram only.** X was removed
2026-09-30 (paid API tier; focus is Facebook/Instagram). The "4th platform"
was never specified, so there's nothing to build. One saved test ad
(`6ab6b04ed7da1a6fc6e8c291`, "sdfas sdf safd") still lists `x` in its
`platforms`/`results` — delete it in `/admin/ads`, or it can't be re-posted
(the model no longer accepts `x`).

**4.10 — Catalog has leftover test products with garbage delivery fees.**
Found while debugging a ৳54,576 delivery fee at checkout (2026-09-22) — not
a code bug, just placeholder products (e.g. "dsfa sdfsdfs af", keyboard-mash
names) with keyboard-mash `deliveryFeeInsideCity`/`OutsideCity` values
(455454, 54544, etc.) left over from earlier testing, correctly summed by
the flat-fee fallback. Delete or fix these via `/admin/products` before
relying on real checkout totals. Since 2026-09-29 new saves are capped at
৳5,000 per fee (`MAX_DELIVERY_FEE`), so these can't be re-saved until
fixed, and new typos are rejected — but existing rows weren't touched. Same products' `weightKg` is also unset
(defaults to 0.5kg in code) — worth setting real weights too once 2.8's
Pathao quote is actually live, since that's what sizes it.

**4.12 — The two-step verification screens have no Bangla text.** Their 9
`auth.twoFactor*`/`settings.twoFactor*` strings were never added to
`server/src/data/translationSeed.ts`, so `npm run sync-translations` can't
pick them up and they always show in English. Small, since only
admins/co-admins ever see them. (Everything else in the seed was synced to
the database; the drawer `modal.*` strings were added on 2026-09-30.)

**4.13 — Low-stock numbers are still per product, not per variant.** The
dashboard's "running low" and the stock filter use the product's total, so
one sold-out size of an otherwise well-stocked hoodie isn't flagged there
(Manage Products' row does show "N variants sold out"). Relatedly,
ad/campaign captions ("now ৳X") quote the product's lowest variant price.

**4.14 — Small ideas raised along the way, none requested yet:**
- Email the customer when the store replies to their review.
- "Remember this device for 30 days" for two-step verification — right now
  every admin login asks for a code.
- FYI, no work needed: the homepage "Our Store in Numbers" section currently shows only products
  and categories; rating, orders delivered and districts appear on their
  own once they pass their minimums (5 reviews at 4.0+, 20 delivered
  orders, 5 districts).

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
  - **2026-10-05: live and verified for page views.** Version 4 (base + four event tags) had been published already. Version 5 (published by the user): the base tag only runs `fbq('init')`, "Once per page"; a new `Meta PageView` tag fires on the site's own `page_view` dataLayer event with the base as its setup tag — before this, only full page loads counted, so in-site navigation sent no PageView. Checked live: home → Shop → About sent exactly three PageViews and one pixel init. **Still open:** a live check that ViewContent/AddToCart/InitiateCheckout/Purchase arrive — needs a real product in the catalog. Optional: set the base tag as setup tag on the four event tags too.
  - `FACEBOOK_PAGE_ACCESS_TOKEN`/`INSTAGRAM_BUSINESS_ACCOUNT_ID` still blank — the separate `/admin/ads` posting feature needs those (a Facebook Developer app + long-lived Page token), not needed for the pixel/GTM work above.
- ✅ **2.10** — `Organization`/`WebSite` JSON-LD added to the homepage (2026-09-23), same script-tag pattern as `FAQSection`'s existing JSON-LD. Deliberately omitted `sameAs` (Navbar.tsx/Footer.tsx's `SOCIAL_LINKS` are still placeholder URLs like `https://facebook.com`, not the store's real profiles — fabricating `sameAs` would be worse than omitting it) and `potentialAction`/SearchAction (no working search endpoint exists to point one at). Both are easy follow-ups once real social URLs/search exist. Manual submission half: domain verified in Google Search Console via DNS TXT record, sitemap submitted to both Search Console and Bing Webmaster Tools (set up via "Import from Google") — both now confirmed **"Success"** with 18 URLs discovered, Google Discover also surfacing the same 18 pages (2026-09-23).

Added on request since 2026-09-26, not from the original list — full detail in `docs/PROGRESS.md`'s entries of those dates:

- ✅ **Admin tables** — server-side filters on Manage Products (stock, delivery type, date range) and Manage Users (search, role, permission, date range), plus pagination Users never had; category dropdown stays in sync after edits (2026-09-26).
- ✅ **"Create ad" shortcut** from a product row straight into a pre-filled Social media ad (2026-09-26).
- ✅ **Ad links on image posts** — fixed a bug where Facebook/Instagram posts with an image silently dropped the ad's link (2026-09-26).
- ✅ **Security sweep** — two-step verification for admins/co-admins, a full route-guard audit, a real NoSQL operator-injection bug fixed across every auth endpoint, JSON-LD script breakout and contact-email HTML injection fixed, JWT algorithm pinned (2026-09-26). What's still open from it: 3.9, 3.10, 3.12.
- ✅ **Product options & variants** — sizes/colors/weights with per-variant price, stock, SKU and photo, from the admin form through the storefront, cart, checkout and orders (2026-09-27). Still owes a smoke test: 2.12.
- ✅ **Store replies to reviews** — one public reply per review, managed from a new `/admin/reviews` page, shown on the product page (2026-09-28).
- ✅ **Real favicon** — replaced the leftover create-next-app `favicon.ico` with the store logo (2026-09-28).
- ✅ **Homepage "Our Store in Numbers"** — live, honest counts above the FAQ, each hidden until it's worth showing; Bangla synced (2026-09-28).
- ✅ **Side drawers no longer close mid-edit** — drag-release on the backdrop no longer closes them, and backdrop/Esc/✕ ask before discarding typed work (2026-09-28). Owes a click-through (2.13).
- ✅ **3.11** — Rate limits on public analytics tracking (per IP), review posting (per account), and every image-upload route (per account, checked before any file is read into memory) (2026-09-28).
