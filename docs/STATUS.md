# Work status

The single place for **what is open and what is done**. Pick a task by its ID
(`WORK-xx` or `SEC-xx`) and do one at a time. When a task finishes, update its
row here and add a dated entry to [PROGRESS.md](PROGRESS.md) (the full history
log: what changed and how it was verified). How things are built lives in
[ARCHITECTURE.md](ARCHITECTURE.md); costs in [LAUNCH_COSTS.md](LAUNCH_COSTS.md).

Updated: 2026-10-12. Launch target: end of October 2026 (3 products, Cash on
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
| SEC-13 | Infrastructure accounts and backups | Account hardening done by the owner (2026-10-11). Left: (1) backups: nightly encrypted backup + restore-test workflows written (2026-10-11, `.github/workflows/db-backup.yml`, `db-restore-test.yml`); add the Atlas users + GitHub secrets, run a backup, then run the restore test once; (2) Sentry: DSN verified with a test event and the alert email arrived (2026-10-11); just confirm the same `SENTRY_DSN` is set in Railway. Run `npm.cmd --prefix server run security:preflight`. |
| — | Release checklist after each deploy | Run `npm run sync-translations` (new keys from 2FA, sessions, pre-orders, login toasts). Provision indexes listed in ARCHITECTURE.md → "Security design". |

## 2. Open — needs an outside account (no code)

| ID | Task | What's left |
| --- | --- | --- |
| WORK-01 | Live bKash | Waiting on merchant approval. Put live `BKASH_*` in Railway; bKash stops showing "Coming soon" within a minute. Then test success / cancel / failure / reconciliation with small real payments. |
| WORK-02 | SMS | Opt-in and campaign sending are built; needs a BD bulk-SMS account (BulkSMSBD, MimSMS, SSL Wireless) and `SMS_API_URL` / `SMS_API_KEY`. |

## 3. Open — security checks owed on staging/live

All code for SEC-01 … SEC-11 is written, tested (backend 331 tests, frontend 87,
both builds) and the backend is deployed (`19423ab`). These live checks remain;
the user deferred them on 2026-10-09.

| ID | Area | Check still owed |
| --- | --- | --- |
| SEC-01/02/03 | Tokens, 2FA changes, sessions | Live Google + password + staff-2FA login; factor replace/disable; logout vs. "sign out on all devices"; password reset kills old sessions in a second browser; refresh after 15 min; multi-tab. |
| SEC-04 | Cancellation + restock | Race cancellations on a real replica set: exactly one restock, cancelled orders never reopen. |
| SEC-05 | Checkout abuse / payment reservations | Checked 2026-10-12: indexes present, replica set, no old pending online orders (0 orders). Duplicate-submit verified live: two simultaneous requests + a retry gave one order and one stock decrement; same key with a different cart got 409. Left: 30-min reservation worker releases once (needs live bKash, WORK-01). |
| SEC-06 | Shared carts | Two payers on one link; expired/legacy links rejected. |
| SEC-08 | HttpOnly cookies + proxy | Checked 2026-10-12: cross-site / wrong-origin / header-less POSTs get 403, forged bearer ignored, blocked routes 404. Signed-in check passed: JavaScript sees only `not-a-credential` markers, requests work through the hidden cookies, the API rejects the marker. Left: old browser sessions must sign in again (no old session was available to try). |
| SEC-09 | Image re-encoding | Product photo upload verified live (2026-10-12). Left: banner/profile uploads; corrupt/animated/oversized files rejected. |
| SEC-10 | Input validation | Verified live 2026-10-12: a product edited to add variants + pre-order saved correctly. Nothing left. |
| SEC-11 | Rate limits / DDoS | Edge/WAF in front of the API, direct-origin access, spoofed IP headers, limits shared across instances. Small agreed staging load only — never load-test the live store. |

## 4. Proposed features (not started unless noted)

| ID | Status | Task |
| --- | --- | --- |
| WORK-10 | **Done locally** | Change History at `/admin/audit-log` (full admin only) logs every admin/co-admin change — products, banners, orders, user access, promo codes, ads, campaigns, messages, reviews, translations, analytics resets, own password/2FA/profile — with before → after values; works on phones (2026-10-11). Admin changes verified live 2026-10-12. Left: make a change as a co-admin and check it shows. History starts at deployment (no backfill); sign-ins aren't logged. |
| WORK-06 | **Done locally** | Bangla text for the two-step verification strings (plus a few other untranslated settings/auth/checkout strings) added to `translationSeed.ts`, 24 keys (2026-10-11). Left: deploy, `npm run sync-translations`, check the 2FA screens in Bangla. |
| WORK-07 | Proposed | Customer delivery timeline + status notifications. |
| WORK-08 | **Done locally** | Returns, exchanges and refunds (2026-10-11). Customers request from My Orders within 7 days of delivery; staff handle them at `/admin/returns` (approve/reject, mark received with optional restock, record refund, mark exchange sent) and can log phone requests from Manage Orders. Refunds are recorded by hand; the bKash Refund API is built but shows "Coming soon" until bKash is live (and is not sandbox-verified). Left: deploy, `npm run sync-translations`, try a full return and an exchange in a browser. **Broken on the live site until the proxy fix of 2026-10-12 is deployed** (`returns` was missing from the frontend proxy allowlist, every request 404). |
| WORK-09 | **Done locally** | Low stock is now per variant (dashboard list, Manage Products filter, analytics) and every stock change is logged in a stock history, viewable per product in Manage Products (2026-10-11). No alert emails (owner's choice). Verified live 2026-10-12 (staff edit, sale, cancellation all logged; stock restored). Left: return restock, once returns work. |
| WORK-11 | **Done locally** | Payment reconciliation at `/admin/payments` (2026-10-11): bKash/COD collected, refunds, net; flagged and stuck bKash orders with "Re-check with bKash" and a required-note resolve (mark paid / cancel / close). Left: deploy the proxy fix of 2026-10-12 (`payments` was missing from the allowlist, the page gets 404s on the live site); can only be truly exercised once bKash is live. |
| WORK-12 | **Done** | Active sessions in Settings (browser, OS, IP, last active; sign out one device) plus a "new sign-in" email when a browser the account hasn't used signs in (2026-10-11). Verified live by the owner (2026-10-11). |
| WORK-13 | **Done locally** | The customer gets an email the first time the store replies to their review; editing the reply doesn't send another (2026-10-11). Left: deploy, post a reply on `/admin/reviews` and check the email arrives. |
| WORK-14 | **Done locally** | Promo code and pre-order discounts no longer stack (2026-10-11): the bigger one wins, ties go to pre-order, and a losing promo code is not recorded on the order. Checkout preview verified live 2026-10-12 (10% code + 20% pre-order shows only the pre-order discount). Left: place one such order and confirm the stored discount. |
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
