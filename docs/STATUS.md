# Work status

The single place for **what is open and what is done**. Pick a task by its ID
(`WORK-xx` or `SEC-xx`) and do one at a time. When a task finishes, update its
row here and add a dated entry to [PROGRESS.md](PROGRESS.md) (the full history
log: what changed and how it was verified). How things are built lives in
[ARCHITECTURE.md](ARCHITECTURE.md); costs in [LAUNCH_COSTS.md](LAUNCH_COSTS.md).

Updated: 2026-10-11. Launch target: end of October 2026 (3 products, Cash on
Delivery + Pathao).

A task is **Done** only after its acceptance checks pass. "Done locally" means
the code and tests are finished but a live/staging check is still owed.

---

## 1. Open — before launch

| ID | Task | What's left |
| --- | --- | --- |
| WORK-03 | First real Pathao booking | "Book with Pathao" on a genuine order; confirm pickup, tracking and the COD amount. Don't create test pickups. 22 of 494 upazilas (mostly Rangamati) have no Pathao zone and use the flat fee. |
| WORK-05 | Clean the catalog | Test products deleted (2026-10-11). Left: add the real launch products with real `weightKg` values; delete the test ad `6ab6b04ed7da1a6fc6e8c291` that still lists `x` if it's still there. |
| WORK-04 | Click-through checks on the live site | User pagination (needs >1 page of users); post/edit/remove a store reply on `/admin/reviews`; Google sign-in from a link opened inside Facebook/Instagram; pre-orders end to end (never tried in a browser); Meta pixel ViewContent / AddToCart / InitiateCheckout / Purchase arriving (needs a real product). |
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
| SEC-05 | Checkout abuse / payment reservations | Duplicate-submit returns the same order; 30-min reservation worker releases once; review any old pending online orders by hand (they have no deadline). |
| SEC-06 | Shared carts | Two payers on one link; expired/legacy links rejected. |
| SEC-08 | HttpOnly cookies + proxy | No real token visible to JavaScript; cross-site POST fails; old browser sessions must sign in again. |
| SEC-09 | Image re-encoding | Normal product/banner/profile uploads work; corrupt/animated/oversized files rejected. |
| SEC-10 | Input validation | Edit a product with variants and pre-order on staging (multipart). |
| SEC-11 | Rate limits / DDoS | Edge/WAF in front of the API, direct-origin access, spoofed IP headers, limits shared across instances. Small agreed staging load only — never load-test the live store. |

## 4. Proposed features (not started unless noted)

| ID | Status | Task |
| --- | --- | --- |
| WORK-10 | **Done locally** | Change History at `/admin/audit-log` (full admin only) logs every admin/co-admin change — products, banners, orders, user access, promo codes, ads, campaigns, messages, reviews, translations, analytics resets, own password/2FA/profile — with before → after values; works on phones (2026-10-11). Left: deploy, make a change as a co-admin and check it shows. History starts at deployment (no backfill); sign-ins aren't logged. |
| WORK-06 | Deferred | Bangla text for the 9 two-step-verification strings (add to `translationSeed.ts`, sync). |
| WORK-07 | Proposed | Customer delivery timeline + status notifications. |
| WORK-08 | **Done locally** | Returns, exchanges and refunds (2026-10-11). Customers request from My Orders within 7 days of delivery; staff handle them at `/admin/returns` (approve/reject, mark received with optional restock, record refund, mark exchange sent) and can log phone requests from Manage Orders. Refunds are recorded by hand; the bKash Refund API is built but shows "Coming soon" until bKash is live (and is not sandbox-verified). Left: deploy, `npm run sync-translations`, try a full return and an exchange in a browser.|
| WORK-09 | Proposed | Per-variant low-stock alerts + stock ledger (dashboard "running low" is per product today; ad captions use the lowest variant price). |
| WORK-11 | **Done locally** | Payment reconciliation at `/admin/payments` (2026-10-11): bKash/COD collected, refunds, net; flagged and stuck bKash orders with "Re-check with bKash" and a required-note resolve (mark paid / cancel / close). Left: deploy; can only be truly exercised once SEC-05 is verified live and bKash is live. |
| WORK-12 | Proposed | "Active sessions" list with revoke + security-alert emails. |
| WORK-13 | Proposed | Email the customer when the store replies to their review. |
| WORK-14 | Decision | Pre-order and promo-code discounts currently stack — decide whether one should win. |
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
