# Work status

The single place for **what is open and what is done**. Pick a task by its ID
(`WORK-xx` or `SEC-xx`) and do one at a time. When a task finishes, update its
row here and add a dated entry to [PROGRESS.md](PROGRESS.md) (the full history
log: what changed and how it was verified). How things are built lives in
[ARCHITECTURE.md](ARCHITECTURE.md); costs in [LAUNCH_COSTS.md](LAUNCH_COSTS.md).

Updated: 2026-10-19. Launch target: end of October 2026 (3 products, Cash on
Delivery + Pathao).

A task is **Done** only after its acceptance checks pass. "Done locally" means
the code and tests are finished but a live/staging check is still owed.

---

## 1. Open — before launch

| ID | Task | What's left |
| --- | --- | --- |
| WORK-03 | First real Pathao booking | "Book with Pathao" on a genuine order; confirm pickup, tracking and the COD amount. Don't create test pickups. 22 of 494 upazilas (mostly Rangamati) have no Pathao zone and use the flat fee. |
| WORK-05 | Clean the catalog | Test products deleted (2026-10-11); the 25 test orders and 2 shared-cart links deleted too (2026-10-11, no copy kept). Left: add the real launch products with real `weightKg` values; delete the test ad `6ab6b04ed7da1a6fc6e8c291` that still lists `x` if it's still there. Test data from the 2026-10-12 checks is still on the live store and must be deleted before launch: "TEST product - please do not order", orders #692541 and #692552, one review + reply, promo code TESTQA10 (inactive). |
| WORK-04 | Click-through checks on the live site | Checked 2026-10-12: store reply posted on `/admin/reviews`; Meta pixel PageView / ViewContent / AddToCart / InitiateCheckout fire; a pre-order with variants reaches checkout with its discount. Left: user pagination (needs >1 page of users); edit/remove a reply; Google sign-in from a link opened inside Facebook/Instagram; place a pre-order; Meta pixel Purchase. |
| SEC-13 | Infrastructure accounts and backups | Account hardening done by the owner (2026-10-11): 2FA is on for Sentry, MongoDB Atlas, Vercel, GitHub, Railway, Cloudinary, the Google account (sign-in console, GTM, Search Console), Resend, Meta Business and Namecheap (domain + email) (confirmed 2026-10-12). 2FA not yet confirmed for the Pathao merchant panel. Left: (1) backups: nightly encrypted backup + restore-test workflows written (2026-10-11, `.github/workflows/db-backup.yml`, `db-restore-test.yml`); add the Atlas users + GitHub secrets, run a backup, then run the restore test once; (2) Sentry: DSN verified with a test event and the alert email arrived (2026-10-11); just confirm the same `SENTRY_DSN` is set in Railway. Run `npm.cmd --prefix server run security:preflight`. |
| — | Release checklist after each deploy | Run `npm run sync-translations` whenever `translationSeed.ts` changed (last run by the owner 2026-10-13; five more rows were added after it). Provision indexes listed in ARCHITECTURE.md → "Security design". |

## 2. Open — needs an outside account (no code)

| ID | Task | What's left |
| --- | --- | --- |
| WORK-01 | Live bKash | Waiting on merchant approval. 2026-10-19: `BKASH_ALLOW_SANDBOX=true` lets production use sandbox credentials for testing — remove it before taking real orders. Put live `BKASH_*` in Railway; bKash stops showing "Coming soon" within a minute. Then test success / cancel / failure / reconciliation with small real payments. |
| WORK-02 | SMS — **live** (send verified 2026-10-18) | REVE SMS (revesms.com) wired in (2026-10-18): order status texts (placed, confirmed/paid, shipped, delivered, cancelled) to the order's shipping phone, plus the existing campaign SMS. Deployed `805c5a4`; a confirmed test order texted the owner. Dashboard SMS balance tile also built. Balance tile verified live (৳1999.36, via `SMS_CLIENT_ID`). Left: check the other status events. |

## 3. Open — security checks owed on staging/live

All code for SEC-01 … SEC-11 is written, tested (backend 331 tests, frontend 87,
both builds) and the backend is deployed (`19423ab`). These live checks remain;
the user deferred them on 2026-10-09.

| ID | Area | Check still owed |
| --- | --- | --- |
| SEC-01/02/03 | Tokens, 2FA changes, sessions | Live Google + password + staff-2FA login; factor replace/disable; logout vs. "sign out on all devices"; password reset kills old sessions in a second browser; refresh after 15 min; multi-tab. |
| SEC-04 | Cancellation + restock | Race cancellations on a real replica set: exactly one restock, cancelled orders never reopen. |
| SEC-05 | Checkout abuse / payment reservations | Checked 2026-10-12: indexes present, replica set, no old pending online orders (0 orders). Duplicate-submit verified live: two simultaneous requests + a retry gave one order and one stock decrement; same key with a different cart got 409. Left: 30-min reservation worker releases once (needs live bKash, WORK-01). |
| SEC-06 | Shared carts | Two payers on one payment link (needs live bKash); expired and unsigned links rejected (see SEC-21). |
| SEC-08 | HttpOnly cookies + proxy | Checked 2026-10-12: cross-site / wrong-origin / header-less POSTs get 403, forged bearer ignored, blocked routes 404. Signed-in check passed: JavaScript sees only `not-a-credential` markers, requests work through the hidden cookies, the API rejects the marker. Left: old browser sessions must sign in again (no old session was available to try). |
| SEC-09 | Image re-encoding | Product photo upload verified live (2026-10-12). Left: banner/profile uploads; corrupt/animated/oversized files rejected. |
| SEC-10 | Input validation | Verified live 2026-10-12: a product edited to add variants + pre-order saved correctly. Nothing left. |
| SEC-11 | Rate limits / DDoS | Edge/WAF in front of the API, direct-origin access, spoofed IP headers, limits shared across instances. Small agreed staging load only — never load-test the live store. |
| SEC-15 | API answers the storefront only | **Done** (2026-10-12): in production the API returns 403 to any `/api` request without the shared `INTERNAL_API_SECRET`, before the rate limiter or database are touched. The storefront proxy and server-side rendering send it. Open on purpose: `/api/health`, `/api/orders/bkash/callback`, `/uploads`. Deployed 2026-10-12 (frontend first, backend after); the owner reports the live store working. Verified live 2026-10-12: direct requests to `/api/products` and `/api/categories` return 403 and `/api/health` returns 200. Nothing left for this task. This does not stop a large flood from reaching Railway; an edge/WAF (SEC-11) is still the real fix. |
| SEC-16 | Staff-only order fields reach the customer | **Deployed, not yet checked as a customer** (2026-10-13, `0e19289`). Every order response a customer receives (`GET /api/orders/my`, the owner path of `GET /api/orders/:id`, self-cancel, and checkout including its retry replies) now carries only an allowlist of customer fields; `internalNote`, the courier fields, the payment-review fields, the bKash ids and the idempotency key/fingerprint are gone. Staff routes are unchanged. Left: as a customer check My Orders, the print page and a checkout still work and that the `/orders/my` response has no staff fields (needs a product on the store). |
| SEC-14 | Storefront security headers | **Deployed** (headers checked live 2026-10-13): every page and route now sends `Content-Security-Policy` (`frame-ancestors`, `base-uri`, `object-src` only), `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`; `X-Powered-By` removed. Checked live 2026-10-13: all five headers are on `/`, `/about` and the `/api/backend` proxy, `X-Powered-By` is gone, GTM and the Meta pixel still load and fire `page_view`. Left: confirm Google sign-in and "copy link" still work. No `script-src` (see ARCHITECTURE.md). |
| SEC-17 | Checkout SMS / stock abuse | **Done locally** (2026-10-18): BD-mobile phone required at checkout, max 3 pending orders per account, 10 orders/day per account, order texts capped per phone. Left: deploy; check a normal checkout and that a 4th pending order is refused. |
| SEC-18 | Name injection in account emails | **Done locally** (2026-10-18): names escaped in emails, 80 chars, no links/markup. Left: deploy; sign up with a link in the name and see it refused. |
| SEC-19 | Staff two-step verification required | **Done locally** (2026-10-18): staff routes refuse admins/coadmins without 2FA; dashboard banner points to Settings. Left: deploy; every coadmin turns on 2FA. |
| SEC-20 | SMS balance never sends API/secret key | **Done locally** (2026-10-18): only `SMS_CLIENT_ID` is used. Left: deploy; tile still shows the balance. |
| SEC-21 | Guessable payment links | **Done locally** (2026-10-19, audit). `/pay/<id>` used the bare cart id, which is partly predictable, so a stranger could see who a link was for and press Pay to hold stock, block the link and use up the asker's open orders. Links are now `<id>-<signature>` (HMAC with `JWT_SECRET`); a bare id is a 404; pay calls also count against the asker's 10 orders a day; `createOrder` no longer takes `sharedCartId`; page tracking records `/pay` without the link. Left: deploy (frontend and backend together, with the unpushed `35ccb9b`); make a link and open it in a private window; check the old `/pay/<id>` form is "not found". Links made before this stop working. The Meta pixel still sees the full page address through GTM. |
| SEC-22 | Promo codes are all public, no use limits | **Open** (2026-10-19 audit). `GET /api/promo-codes/active` lists every active code, so a code meant for one person (or a test code) is visible to anyone; codes have no total or per-customer limit. Plan: a "show on site" flag (default off) and optional usage limits. |
| SEC-23 | Staff 2FA code guessing | **Open** (2026-10-19 audit). `/api/auth/2fa/verify-login` is limited per IP only (20 per 15 min), so many IPs can keep guessing one account's code; a used code works again inside its 30-second window. Plan: per-account limit keyed by the challenge's user id, remember the last used time-step. |
| SEC-24 | Low-risk hardening | **Open** (2026-10-19 audit). Banner button link and `accentColor` unvalidated; login/register say which emails have accounts; reviews from unverified accounts; `dangerouslyAllowLocalIP` on in production plus leftover `picsum.photos`/`fbsbx.com` image hosts in `next.config.ts`; oauth-sync secret compared with `!==`; Pathao webhook accepts the raw secret as a signature; wishlist has no size cap; two return requests at once can claim the same item. |

## 4. Proposed features (not started unless noted)

| ID | Status | Task |
| --- | --- | --- |
| WORK-10 | **Done locally** | Change History at `/admin/audit-log` (full admin only) logs every admin/co-admin change — products, banners, orders, user access, promo codes, ads, campaigns, messages, reviews, translations, analytics resets, own password/2FA/profile — with before → after values; works on phones (2026-10-11). Admin changes verified live 2026-10-12. Left: make a change as a co-admin and check it shows. History starts at deployment (no backfill); sign-ins aren't logged. |
| WORK-06 | **Done locally** | Bangla text for the two-step verification strings (plus a few other untranslated settings/auth/checkout strings) added to `translationSeed.ts`, 24 keys (2026-10-11). Deployed and synced (owner ran `npm run sync-translations` 2026-10-13). Checked live in Bangla 2026-10-13: Settings is in Bangla except five hint strings that had no seed row (`settings.twoFactorHint`, `settings.twoFactorScanQr`, `settings.backupCodesWarning`, `settings.deliveryLocationHint`, `auth.twoFactorInstructions`); rows added 2026-10-13. Left: deploy, run `npm run sync-translations` once more, re-check. The 2FA setup and sign-in code screens themselves were not opened. |
| WORK-07 | **Deployed, not yet checked live** | Customer delivery timeline and status emails (2026-10-12). My Orders shows each order's progress (Order placed → Confirmed → On the way → Delivered, or Cancelled) with the date of each step. The customer is emailed when a cash-on-delivery order is placed and whenever an order is confirmed/paid, shipped, delivered or cancelled. Email only; no SMS. Orders entered by staff without a customer account get no email. Deployed 2026-10-12 (`96ff434`, backend and frontend). Translations synced 2026-10-13 (the 6 `orderTimeline.*` keys are in the live dictionary). Left: place an order, move it through the statuses in Manage Orders and check the timeline and that each email arrives. |
| WORK-08 | **Done locally** | Returns, exchanges and refunds (2026-10-11). Customers request from My Orders within 7 days of delivery; staff handle them at `/admin/returns` (approve/reject, mark received with optional restock, record refund, mark exchange sent) and can log phone requests from Manage Orders. Refunds are recorded by hand; the bKash Refund API is built but shows "Coming soon" until bKash is live (and is not sandbox-verified). Deployed and synced; `/admin/returns` loads on the live site (2026-10-13, empty list, API 200), so the proxy fix of 2026-10-12 is live. Left: try a full return and an exchange in a browser. 2026-10-19: return countdown on My Orders and rider pickups (staff book in Pathao panel after approval, store pays, tracked by webhook) — not yet tried live. |
| WORK-09 | **Done locally** | Low stock is now per variant (dashboard list, Manage Products filter, analytics) and every stock change is logged in a stock history, viewable per product in Manage Products (2026-10-11). No alert emails (owner's choice). Verified live 2026-10-12 (staff edit, sale, cancellation all logged; stock restored). Left: return restock, once returns work. |
| WORK-11 | **Done locally** | Payment reconciliation at `/admin/payments` (2026-10-11): bKash/COD collected, refunds, net; flagged and stuck bKash orders with "Re-check with bKash" and a required-note resolve (mark paid / cancel / close). `/admin/payments` loads on the live site with its totals (2026-10-13, API 200), so the proxy fix of 2026-10-12 is live. Left: can only be truly exercised once bKash is live. |
| WORK-12 | **Done** | Active sessions in Settings (browser, OS, IP, last active; sign out one device) plus a "new sign-in" email when a browser the account hasn't used signs in (2026-10-11). Verified live by the owner (2026-10-11). |
| WORK-13 | **Done locally** | The customer gets an email the first time the store replies to their review; editing the reply doesn't send another (2026-10-11). Left: deploy, post a reply on `/admin/reviews` and check the email arrives. |
| WORK-14 | **Done locally** | Promo code and pre-order discounts no longer stack (2026-10-11): the bigger one wins, ties go to pre-order, and a losing promo code is not recorded on the order. Checkout preview verified live 2026-10-12 (10% code + 20% pre-order shows only the pre-order discount). Left: place one such order and confirm the stored discount. |
| WORK-16 | **Done** | Category list at `/admin/categories` (needs `products:manage`): name, optional Bangla name, optional photo, order (2026-10-12). The product form picks from this list. A category shows on the storefront only once it has a product; renaming renames it on its products; a category with products can't be deleted. All changes go to Change History. Existing product categories are added to the list automatically when the server starts. Deployed and verified live 2026-10-12: an empty category stays hidden, a duplicate name and an unlisted product category are refused, the photo tile and Bangla name show on `/categories`, a rename carries over to the product, delete is refused while a product is in it, and create/update/delete appear in Change History. Test category and product removed afterwards. Not looked at: the tile on the home page (same component) and reordering with more than one category. |
| WORK-17 | **Steps 1–3 done locally** | Order handling with tracking (2026-10-18). Step 1: staff order page `/admin/orders/[id]` with WhatsApp/call, customer history (by account + phone) and a step-by-step timeline with the next action and who did each step. Step 2 (2026-10-18): Manage Orders list is read-only (open an order to edit it) and every courier status is kept in a Courier tracking history on the order page. Left: deploy + check on a live order; Pathao webhook built 2026-10-19 (statuses arrive by themselves once set up in the Pathao panel + Railway env; automatic Shipped/Delivered off until real webhooks are seen). Step 3 (2026-10-19): customer order page `/orders/[id]`; My Orders is a list; checkout, emails and texts link to the order page. Left for step 3: deploy, `npm run sync-translations`, check as a customer. |
| WORK-15 | Later | Upgrade Atlas off the shared/Flex tier before a real sales event (storage cap, throttling). |
| — | Deferred | "Remember this device for 30 days" for 2FA — after the session work is verified live. |

---

## 5. Done

Dates point to the matching entries in [PROGRESS.md](PROGRESS.md).

**Launch basics**
- Real domain: `shohojepai.com` on Vercel, `api.shohojepai.com` on Railway, SSL (09-16…18).
- Admin account; 2FA turned on for it (09-18, 10-05).
- Email via Resend (domain verified, DKIM/SPF/DMARC) (09-20).
- Real contact info (09-20).
- bKash Tokenized Checkout built; shown as "Coming soon" until live credentials exist (09-20, 10-05, 10-06).
- Pathao live quotes at checkout on the real merchant account; courier name hidden from customers (09-22, 09-30, 10-07).
- Google sign-in in production, consent screen "In production"; Facebook login removed (09-18, 09-20, 10-05).
- Cloudinary image uploads live (09-18, 09-19).

**Store features**
- Overselling fix (transaction + atomic stock), customer cancellation with exact-once restock (09-15).
- Admin dashboard overview, contact-message inbox, analytics + reset tool (09-14, 09-15).
- Product variants (size/colour/weight with own price, stock, SKU, photo) — passed end-to-end live (09-27, 10-05).
- Pre-orders with COD/online discounts (10-06).
- Promo codes, banners, social ads to Facebook + Instagram (X removed), email campaigns with unsubscribe (09-14…09-30).
- Reviews: verified-purchase badge, moderation, store replies (09-15, 09-28).
- Wishlist "move all to cart", case-insensitive categories, analytics 180-day retention (09-15).
- Server-side filters + pagination on Manage Products/Users, "Create ad" shortcut (09-26).
- Full Bangla storefront with `/admin/translations` (09-21).
- Privacy/Terms pages (worth a lawyer's review) (09-15).
- Drawers don't close mid-edit; grouped dashboard sidebar; login/logout messages (09-28, 10-05).
- Homepage: hero, category tiles, "Our Store in Numbers", real logo + favicon (09-19, 09-28).

**SEO & tracking**
- Default OG image, per-page OG/Twitter cards, Organization/WebSite JSON-LD (09-22, 09-23).
- Search Console + Bing verified, sitemap "Success" (09-23).
- GTM `GTM-K7HP3TNT` + Meta Pixel, PageView on in-site navigation verified live (09-22, 10-05).

**Security & reliability**
- Rate limits, helmet, Vitest + CI, crash handling, Sentry wiring (09-15, 09-28).
- NoSQL-injection fix across auth, JSON-LD / contact-email injection fixes, JWT algorithm pinned (09-26).
- SEC-01 token purposes; SEC-02 safe 2FA changes; SEC-03 revocable sessions; SEC-04 transactional cancellation; SEC-05 idempotent checkout + reservations; SEC-06 authoritative shared carts; SEC-08 HttpOnly cookies via proxy; SEC-09 image re-encoding; SEC-10 input validation; SEC-11 shared rate limits + signed client IP; SEC-12 generic errors, 12-char passwords, email verification at checkout, encrypted 2FA secrets — all done locally, see section 3 for live checks (10-07…10-10).
- SEC-12 rollout finished: legacy plaintext 2FA fallback turned off in Railway and local (reported done by the owner, 10-11). Migrating a separate production database, if one exists, is deferred — owner will decide later.
- SEC-07: PM2 removed, production `npm audit` zero findings, deployed as `19423ab` (10-09).
- Deprecated Mongoose `new: true` options replaced (10-09).
