# Launch & Running Costs (estimate)

Prepared 2026-09-29. Prices are from each provider's public pricing page on
that date (sources at the bottom) — they change, so re-check before paying.
Converted at roughly **৳122 = $1**; your card/bank rate plus any foreign-card
fee will move the taka figures a little.

**Vercel (frontend hosting) is deliberately left out** — the plan is to stay
on its free Hobby tier until the business grows. See "Staying on Vercel's free
tier" at the end for the limits that decide when that has to change.

---

## 1. Monthly fixed costs

What you pay every month whether or not anything sells.

| Service | What it runs | Stage 1 — Launch | Stage 2 — Safe | Stage 3 — Growth |
|---|---|---|---|---|
| **Railway** | Backend API (Express) | $5–8 | $10–15 | $20–30 (Pro plan) |
| **MongoDB Atlas** | Database — every product, order, customer | $8 (Flex, 5 GB) | **$57** (M10, automatic backups) | $57+ |
| **Cloudinary** | Product/banner/profile photos | $0 (free, 25 credits) | $0 | $89–99 (Plus) |
| **Resend** | Verification, password-reset, order & campaign emails | $0 (3,000/month, max 100/day) | $20 (50,000/month, no daily cap) | $20–35 |
| **Sentry** | Alerts when the site errors | $0 (free tier) | $0 | $0–26 |
| **Domain + business email** (Namecheap) | shohojepai.com, hello@shohojepai.com | ~$2–3 | ~$2–3 | ~$2–3 |
| **Google Tag Manager / Analytics / Search Console, Meta Page & Pixel** | Tracking, SEO | $0 | $0 | $0 |
| **Monthly total (USD)** | | **≈ $15–19** | **≈ $89–95** | **≈ $190–250** |
| **Monthly total (BDT)** | | **≈ ৳1,800–2,300** | **≈ ৳10,900–11,600** | **≈ ৳23,000–30,500** |

### What each stage means

- **Stage 1 — Launch.** Cheapest setup that is fully working. The one real
  risk: the $8 database tier has **no backups**. Fix that for ~$0 with a
  nightly backup script (item 3.8 in `REMAINING_WORK.md`) — strongly
  recommended before taking real orders.
- **Stage 2 — Safe.** Move the database to M10 as soon as orders are coming in
  regularly: automatic backups and point-in-time restore, so a mistake or
  corruption never wipes out orders and customers. Move to Resend Pro when you
  start sending email campaigns (the free plan stops at 100 emails a day).
- **Stage 3 — Growth.** Only when traffic/catalog genuinely demand it: more
  backend capacity, Cloudinary Plus once photos + traffic pass the free
  credits.

### Notes on the estimates

- **Railway** bills for what the server actually uses (RAM $10/GB-month, CPU
  $20/vCPU-month, traffic $0.05/GB), minus the credit included in the plan
  ($5 on Hobby, $20 on Pro). A small Express API like this one sits around
  0.3–0.5 GB of RAM with little CPU, hence $5–8 at launch.
- **Cloudinary free** = 25 credits/month, where 1 credit = 1 GB stored *or*
  1 GB served *or* 1,000 image transformations. A catalog of a few hundred
  products fits comfortably.
- **Domain + email** figures are from memory of Namecheap's usual renewal
  prices (a .com ≈ $15–18/year, Private Email ≈ $1–2/month) — check your
  Namecheap renewal invoice for the exact number.

---

## 2. Costs per order (only when you sell)

| What | Rate | Who usually pays |
|---|---|---|
| **bKash payment** | ~1.5–2% of each bKash payment (confirm your exact merchant rate with bKash) | Store |
| **Pathao delivery — same city** | ৳60 (≤500 g), ৳70 (1 kg), ৳90 (2 kg), +৳15 per extra kg | Customer (via delivery fee at checkout) |
| **Pathao delivery — other cities** | ৳110–120 (≤500 g), +৳25 per extra kg | Customer (via delivery fee at checkout) |
| **Pathao cash-on-delivery charge** | 1% of the amount collected | Store |
| **SMS** (once a gateway is set up) | ~৳0.25–0.30 per SMS (non-masking) | Store |

Pathao rates exclude VAT.

### Example month — 300 orders, ৳1,500 average

Assumes 30% pay by bKash, 70% cash on delivery, 60% same-city delivery, and
2 SMS per order (confirmation + shipped).

| Item | Calculation | Amount |
|---|---|---|
| bKash fees | 90 orders × ৳1,500 × ~1.75% | ≈ ৳2,360 |
| Pathao COD charge | 210 orders × ৳1,500 × 1% | ≈ ৳3,150 |
| SMS | 600 × ৳0.28 | ≈ ৳170 |
| Pathao delivery | 180 × ৳60 + 120 × ৳115 | ≈ ৳24,600 — **normally recovered from customers' delivery fees** |
| **Store's own per-order cost** | (excluding delivery) | **≈ ৳5,700 / month** (~1.3% of ৳450,000 sales) |

---

## 3. One-time / setup costs

| Item | Cost | Status |
|---|---|---|
| Domain registration | Already paid | Done |
| bKash merchant account | Usually no setup fee — needs trade license and bank details | Open (currently on bKash's sandbox) |
| Pathao merchant account + Store ID | Free | Open — item 2.8 |
| SMS gateway | Prepaid top-up, ~৳500 to start | Open — item 2.6 |
| Trade license / business registration | Varies by city corporation | Your side, not tech |

---

## 4. Bottom line

| | Per month |
|---|---|
| **Launch (Stage 1, + free backup script)** | **≈ ৳1,800–2,300** fixed + ~1.3% of sales |
| **Recommended once orders are regular (Stage 2)** | **≈ ৳10,900–11,600** fixed + ~1.3% of sales |

---

## Staying on Vercel's free tier

Speed is the same as paid — Hobby runs on the same global network. What it
has are **hard monthly caps**; when one is hit, that feature stops for up to
30 days rather than billing you. Caps that matter for this shop:

| Hobby limit (per month) | What uses it here | Risk |
|---|---|---|
| **5,000 image transformations** | Every product/banner photo shown through Next.js's image optimizer, once per size/format | **Highest** — a growing catalog can pass this; images would stop being optimized/served. Fix: let Cloudinary resize the images instead (a small code change — it's already paying for that on its free credits). |
| 100 GB data transfer | Page and asset downloads | Low — tens of thousands of visits |
| 1,000,000 edge requests / function invocations | Every page and asset request | Low–medium at launch |
| 4 CPU-hours of function time | Server-rendering pages (homepage, product pages) | Low–medium — roughly hundreds of thousands of page renders |
| 1 hour of runtime logs, no email support | Debugging production issues | Inconvenience, not an outage |

Also note: Vercel's fair-use terms say Hobby is for **personal, non-commercial**
use. Vercel may ask a store to upgrade — budget for Pro ($20/month, ≈ ৳2,440)
as the first upgrade once sales are steady.

---

Sources:
[Vercel Hobby plan](https://vercel.com/docs/plans/hobby) ·
[Railway pricing](https://railway.com/pricing) ·
[MongoDB Atlas pricing](https://www.mongodb.com/pricing) ·
[Cloudinary pricing](https://cloudinary.com/pricing) ·
[Resend pricing](https://resend.com/pricing) ·
[bKash vs cards fees 2026 (Moneybag)](https://moneybag.com.bd/gateway-fees-breakdown-bkash-vs-cards/) ·
[bKash merchant fees (Banikh)](https://banikh.com/en/blog/bkash-nagad-payment-guide) ·
[Pathao delivery charges](https://help.pathao.com/what-is-the-delivery-charge-inside-or-outside-the-city/) ·
[Pathao rates & COD 2026 (Bizmend)](https://bizmend.com/blog/pathao-courier-service-ecommerce-bangladesh/) ·
[BulkSMSBD](https://bulksmsbd.com/) ·
[Bulk SMS price 2026 (MiMSMS)](https://www.mimsms.com/bulk-sms-price-in-bangladesh-2026)
