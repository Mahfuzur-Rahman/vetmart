# CLAUDE.md — VetMart BD

Veterinary medicine & animal-health e-commerce for the Bangladesh market.

> Rename `VetMart` throughout once branding is decided. Everything else in this file is a decision, not a suggestion.

---

## 1. What this is

A B2C + B2B storefront selling veterinary drugs, vaccines, feed supplements, instruments, and pet products in Bangladesh.

Three audiences, one codebase:

| Audience | Behaviour | Needs |
|---|---|---|
| **Farmers** (poultry, dairy, goat, fish) | Bulk, price-sensitive, Bangla-first, COD | Species filter, pack pricing, Bangla product names |
| **Registered vets & AI technicians** | Search by generic name, need Rx products | Generic search, verified-vet pricing, Rx workflow |
| **Pet owners** (Dhaka/Chattogram urban) | Small basket, card/MFS payment, English-comfortable | Pet food, accessories, fast delivery |

Not a marketplace. Single-seller inventory model.

---

## 2. Hard rules — do not violate

1. **Business logic never lives in a route handler or a page component.** It lives in `lib/services/*`. Route handlers and Server Components are thin transports over the same functions. This is what makes the Flutter app possible later without a rewrite.
2. **Never call an external API (Steadfast, SSLCommerz, SMS) inside a request cycle.** Enqueue a BullMQ job.
3. **Every stock movement is a row in `stock_ledger`.** Never `UPDATE products SET stock = stock - 1`. Current stock is derived. This is a regulated-goods business; you need a traceable audit trail per batch.
4. **Batch and expiry are mandatory on every drug/vaccine/feed SKU.** No batch = cannot be sold.
5. **All money is `numeric(12,2)` in Postgres and handled as integer paisa in TypeScript.** Never `float`.
6. **All timestamps are `timestamptz`, stored UTC, rendered in `Asia/Dhaka`.**
7. **Bangla is the default language, not a translation layer.** Every user-facing string has `bn` and `en`. Product names have `name_bn` and `name_en`. A missing `bn` string is a build failure, not a silent English fallback.
8. **Never store a formatted number or date.** Store canonical values; format at render per locale. No `"৳ ১,২০০"` anywhere in the database.
9. **Mobile-first, 360px base.** If a screen only works at desktop width, it is unfinished — including admin.
10. **Nothing business-related is hardcoded.** Rates, thresholds, texts, zones, banners, SMS templates all come from the DB and are editable by an admin. See §14.
11. **No service imports a vendor SDK.** Cloudinary, BullMQ, Playwright, Steadfast and the SMS gateway sit behind driver interfaces selected by env (§4.3). The demo runs on Vercel; production runs on a BDIX VPS; the difference must be config, not code.
12. **Do not add a dependency without justifying it in the PR description.** Solo maintainer.

---

## 3. Stack

| Layer | Choice | Note |
|---|---|---|
| App | Next.js 15, App Router, TypeScript strict | Single process serves storefront + admin + API |
| Runtime | Node 22, PM2 cluster mode | 2–4 workers |
| Reverse proxy | Caddy | auto-TLS, simpler than Nginx |
| DB | PostgreSQL 17 — local in prod, Aiven in demo | see §4 |
| ORM | Drizzle | migrations committed, never `push` in prod |
| Cache / session | Valkey | local in prod, Aiven in demo |
| Jobs | BullMQ (prod) / pg-cron drain (demo) | §4.2, same handlers |
| Auth | Auth.js v5 (web cookie) + JWT (mobile) | shared resolver, §8 |
| Images | `sharp` + local disk (prod) / Cloudinary (demo) | §10, driver-based |
| PDF | Playwright (prod) / HTML print view (demo) | §11 |
| Validation | Zod, shared client+server | also feeds OpenAPI → Dart |
| UI | Tailwind + shadcn/ui | |
| Search | Postgres FTS + `pg_trgm` | no Elasticsearch |

**Rejected:** .NET (two stacks for a solo dev, SEO cost), Neon/Supabase (see §4), Elasticsearch (overkill for <50k SKUs), S3/R2 for hot images (breaks BDIX advantage).

---

## 4. Environments

Two targets, one codebase. **Demo/sandbox runs on Vercel + Aiven + Cloudinary. Production runs on a BDIX VPS in Dhaka with everything local.** The whole point of §4.3 is that moving between them is a config change, not a rewrite.

| | Demo / sandbox | Production |
|---|---|---|
| App | Vercel | BDIX VPS, PM2 + Caddy |
| DB | Aiven PostgreSQL (Mumbai) | local Postgres 17, Unix socket |
| Cache/queue | Aiven Valkey + Vercel Cron | local Valkey + BullMQ workers |
| Images | Cloudinary | local disk + `sharp` + Caddy |
| PDF | HTML print view | Playwright → PDF |
| Courier | mock driver | Steadfast live |
| Payment | SSLCommerz sandbox | SSLCommerz live |
| SMS/OTP | mock (fixed code) | live gateway |

---

### 4.1 Production — BDIX

Hosting is a **BDIX-peered VPS in Dhaka** (ExonHost / IT Nut / Dhaka Colo / HostSeba). Minimum **4 vCPU / 8GB RAM / 100GB NVMe**, Ubuntu 24.04 LTS.

#### Two rules that protect the BDIX advantage

1. **Postgres and Valkey run on the same box as the app.** Connect over Unix socket. A managed DB in Singapore adds 60–250ms per query; a product page doing 8 queries becomes unusable. This is non-negotiable.
2. **Cloudflare is DNS-only (grey cloud).** Orange-cloud proxying pulls traffic out of the local exchange and kills the peering benefit for BD ISP users. Use Caddy for TLS.

#### Layout

```
/var/www/vetmart/         app (git checkout, built)
/var/www/media/           uploaded images, served directly by Caddy
/var/backups/pg/          nightly pg_dump, rsynced to Cloudflare R2
/etc/caddy/Caddyfile
```

#### Postgres tuning (8GB box)

```
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 16MB
maintenance_work_mem = 512MB
max_connections = 60
random_page_cost = 1.1        # NVMe
```

Node connects through a pool of 20, not 60.

#### Backups

`pg_dump -Fc` nightly at 03:00 Dhaka → local `/var/backups/pg/` → rsync to R2/B2. Keep 14 daily, 8 weekly. **Media directory backed up weekly.** Test restore monthly — write the restore script now, not after the first incident.

---

### 4.2 Demo / sandbox — Vercel + Aiven + Cloudinary

For demos, client review and testing. It will be slower than production for BD users; that is expected and acceptable. Do not "fix" it by adding CDN layers you'll have to unwind later.

#### Region — get this right or the demo feels broken

Vercel defaults functions to `iad1` (Washington DC). With an Aiven DB elsewhere, every query crosses an ocean twice.

- **Aiven PostgreSQL: AWS `ap-south-1` (Mumbai).** Closest major region to Dhaka, ~40–70ms.
- **Vercel function region: `bom1` (Mumbai).** Set it in `vercel.json`, don't rely on the default.

```json
{ "regions": ["bom1"] }
```

Both in Mumbai keeps app↔DB latency in single-digit ms. Singapore (`sin1` + `ap-southeast-1`) is the acceptable second choice. **Never split them across regions.**

#### Aiven Postgres + serverless connections

Serverless functions each open their own connection and Aiven's free/starter plans have low connection caps. Without pooling you will hit `too many connections` on the first real demo.

1. **Use Aiven's built-in connection pooling (PgBouncer).** Create a pool in `transaction` mode and connect to the **pooled port**, not the direct one.
2. **Transaction-mode pooling breaks prepared statements.** With `postgres-js` + Drizzle you must disable them:
   ```ts
   const client = postgres(process.env.DATABASE_URL!, {
     prepare: false,          // required for PgBouncer transaction mode
     max: 1,                  // one connection per serverless invocation
     idle_timeout: 20,
     connect_timeout: 10,
     ssl: 'require',          // Aiven requires TLS
   });
   ```
   Skipping `prepare: false` produces intermittent, confusing errors under load — not a clean failure.
3. **`max: 1` on Vercel, pool of 20 on the VPS.** Driven by env, not hardcoded.
4. Aiven requires SSL and gives you a CA cert. Store the connection string in Vercel env vars; do not commit the cert.
5. **Run migrations from CI or locally, never at cold start.** `pnpm db:migrate` against the Aiven URL as a deploy step.

#### Cloudinary

Free tier is fine for a demo. Two rules that make the later migration painless:

1. **Store the storage key in the DB, never a full URL.** `product_images.base_path` holds `vetmart/products/{hash}` — the adapter turns it into a Cloudinary URL now and a `/media/...` path later. If full `res.cloudinary.com` URLs land in the database, migration becomes a data-repair project.
2. **Bypass Vercel's image optimizer.** Next `<Image>` on Hobby has a monthly source-image cap, and double-optimizing Cloudinary output is pointless. Use a custom loader that emits Cloudinary transformation URLs:
   ```ts
   // lib/images/cloudinary-loader.ts
   export default function loader({ src, width, quality }) {
     const t = `f_auto,q_${quality ?? 'auto'},w_${width},c_limit`;
     return `https://res.cloudinary.com/${CLOUD}/image/upload/${t}/${src}`;
   }
   ```
   Variant sizes stay the same 200/400/800/1600 as production, so nothing downstream changes.
3. **Prescription images are NOT public.** Upload with Cloudinary `type: 'authenticated'` and serve time-limited signed URLs through your own authenticated route. Never `upload` type. Simplest alternative for the demo: don't enable the Rx module.
4. Generate the blurhash yourself at upload time and store it — do not depend on a Cloudinary feature you'll lose later.

#### Background jobs on Vercel

**BullMQ needs a long-running worker. Vercel has none.** Do not try to make it work.

Demo driver: a `jobs` table in Postgres + **Vercel Cron** hitting a protected drain endpoint every minute.

```
jobs   id, type, payload(jsonb), run_at, attempts, max_attempts,
       status(pending|running|done|failed), last_error, locked_at
```

```json
// vercel.json
{ "crons": [{ "path": "/api/internal/jobs/tick", "schedule": "* * * * *" }] }
```

The drain endpoint claims rows with `FOR UPDATE SKIP LOCKED`, processes up to N, and returns. Protect it with a shared secret header. Production swaps the driver to BullMQ; **the job handler functions are identical in both** — only the dispatcher changes.

Consequence for the demo: courier sync and email/SMS have up to ~60s latency. Fine. Say so in the demo script rather than hacking around it.

#### PDF invoices on Vercel

Playwright/Chromium does not fit Vercel's serverless bundle limit cleanly, and `@react-pdf/renderer` has **no complex-script shaping** — Bangla conjuncts and matras render broken. Do not ship it.

Demo driver: an HTML print view at `/invoice/[id]/print` with a proper `@media print` stylesheet and the Bangla webfont embedded. The user prints to PDF from the browser. It looks correct and costs nothing.

Production driver: Playwright on the VPS renders the *same* HTML template to a real PDF. `renderInvoiceHtml()` lives in `lib/services/invoices.ts` and is shared — only the rasteriser differs.

#### Mock drivers

- **Steadfast has no public sandbox.** Build `COURIER_DRIVER=mock` that returns a fake consignment ID, then fires a simulated status webhook on a timer. This also makes your webhook handler testable, which the real API never will.
- **SSLCommerz has a sandbox** — use it with test credentials.
- **SMS/OTP:** `SMS_DRIVER=mock` writes the OTP to the `otp_requests` row and the server log, and the demo login screen shows it. **Gate on `NODE_ENV !== 'production' && DEMO_MODE === 'true'` and assert it in a test** — an OTP bypass reaching production is the worst bug you can ship.
- Demo seed: `pnpm db:seed:demo` loads ~120 realistic SKUs across species, batches with staggered expiries, a few orders in each status. Plus `pnpm db:reset:demo` so a demo can be re-run clean.

---

### 4.3 Portability — the four drivers

This is what makes the Vercel→VPS move a config change. Each is an interface in `lib/`, selected by env at startup. **No service or component ever imports Cloudinary, BullMQ, or Playwright directly.**

```ts
// lib/storage/index.ts
export interface StorageDriver {
  put(key: string, buf: Buffer, opts: { contentType: string; private?: boolean }): Promise<void>;
  url(key: string, variant: Variant): string;
  signedUrl(key: string, ttlSeconds: number): Promise<string>;   // private assets
  delete(key: string): Promise<void>;
}
```

| Env var | Demo | Production |
|---|---|---|
| `STORAGE_DRIVER` | `cloudinary` | `local` |
| `QUEUE_DRIVER` | `pg-cron` | `bullmq` |
| `PDF_DRIVER` | `html-print` | `playwright` |
| `COURIER_DRIVER` | `mock` | `steadfast` |
| `SMS_DRIVER` | `mock` | `bulksms` |
| `PAYMENT_MODE` | `sandbox` | `live` |
| `DB_POOL_MAX` | `1` | `20` |
| `DEMO_MODE` | `true` | `false` |

Same variable names in both environments. `lib/env.ts` validates all of them with Zod at boot and **fails fast** — a missing var must crash the build, not surface as a null at checkout.

#### Migration checklist (demo → production)

1. Provision VPS, install Postgres 17 / Valkey / Caddy / Node 22.
2. `pg_dump` from Aiven → restore locally. Schema is identical; nothing to transform.
3. Run `scripts/migrate-media.ts`: for each `product_images.base_path`, pull from Cloudinary, run `sharp` to the four variants, write to `/var/www/media/...`. **Because the DB stores keys and not URLs, no database rows change.**
4. Flip the driver env vars, start `vetmart-jobs` under PM2.
5. Point DNS at the BDIX IP, **grey cloud** (§4.1 rule 2).
6. Keep Aiven alive one week as a rollback path, then delete.

---

## 5. Domain model — this is the part that makes it a vet shop

Generic e-commerce schemas break here. These are the differences that matter.

### 5.1 Product classification

Every product has a `product_type` that drives the entire sales flow:

| `product_type` | Rx required | Batch/expiry | Cold chain | Example |
|---|---|---|---|---|
| `drug_otc` | no | **yes** | no | Vitamin-mineral premix, electrolyte |
| `drug_rx` | **yes** | **yes** | no | Enrofloxacin injection, hormones |
| `vaccine` | usually | **yes** | **yes** | ND, Gumboro, FMD, rabies |
| `feed_supplement` | no | **yes** | no | Toxin binder, probiotic |
| `instrument` | no | no | no | Syringe, AI gun, trocar |
| `disinfectant` | no | yes | no | Glutaraldehyde, iodophor |
| `pet_food` | no | yes | no | Dry/wet food |
| `accessory` | no | no | no | Collar, feeder, bowl |

### 5.2 Fields a vet product needs that a normal product doesn't

- `generic_name` — **vets and technicians search by generic, not brand.** Index it. `Enrofloxacin` must find `Renaflox`, `Enrocin`, etc.
- `strength` + `strength_unit` — `100 mg/ml`, `10% w/v`
- `dosage_form` — injection / bolus / powder / oral solution / premix / spray
- `pack_size` + `pack_unit` — `100 ml vial`, `strip of 10 boluses`, `1 kg sachet`. **Price is per pack, not per unit.** Farmers buy cartons; show both.
- `target_species[]` — `cattle`, `buffalo`, `goat_sheep`, `poultry`, `fish`, `dog`, `cat`, `pigeon`. Primary storefront navigation is by species, not by category.
- `withdrawal_period_meat_days`, `withdrawal_period_milk_hours` — **legally and commercially critical for food animals.** Must be shown prominently on the product page and printed on the invoice for any food-animal drug. A farmer who ignores this can lose a milk contract.
- `dgda_registration_no` — DGDA registration reference. Veterinary medicines must be registered with DGDA under the Drugs and Cosmetics Act 2023. Store it; display it on the product page; it is your trust signal.
- `manufacturer_id` — ACI Animal Health, Renata, SK+F, Square, ACME, Eon, Techno Drugs, Elanco, etc. Manufacturer is a real browse axis here.
- `storage_condition` — `room_temp` / `cool_dry` / `2_8_celsius` / `frozen`
- `is_antimicrobial` — flag for AMR-stewardship reporting and for showing responsible-use warnings.

### 5.3 Batch & expiry — mandatory

```
product_batches
  id, product_id, batch_no, mfg_date, expiry_date,
  qty_received, cost_price, supplier_id, created_at
```

- Sellable stock = SUM over batches where `expiry_date > now() + interval '60 days'`.
- **Allocation is FEFO** (first-expiring-first-out) at order-confirm time, not at cart time.
- Order lines store `batch_id` and `batch_no`. The invoice prints batch + expiry per line. This is the whole reason a pharmacy needs different software from a t-shirt shop.
- Admin dashboard: "Expiring in 90 days" report, with value at risk. Auto-block sale at 60 days remaining (configurable per product type; vaccines stricter).

### 5.4 Cold chain

`requires_cold_chain = true` products:
- Restricted to a whitelist of `cold_chain_zones` (initially Dhaka metro + a few districts). Checkout blocks the item outside them with a clear Bangla message.
- Cannot be handed to Steadfast standard. Route to own-rider fulfilment or a cold-chain partner. `fulfilment_channel` on the order line.
- Shipping surcharge for ice-pack packaging.
- Do not launch vaccines in Phase 1. Get the rest working first.

### 5.5 Prescription (Rx) workflow

Prescription-only veterinary drugs must be prescribed by a registered veterinarian. Model it properly:

```
prescriptions
  id, user_id, image_paths[], vet_name, vet_bvc_reg_no,
  issued_date, status (pending|approved|rejected|expired),
  reviewed_by_admin_id, reviewed_at, reject_reason, expires_at
```

Flow: cart contains an Rx item → checkout requires an approved prescription OR a pending upload → order enters `awaiting_rx_review` → pharmacist-role admin approves/rejects → order proceeds or is partially cancelled.

Also support **verified professional accounts**: a user who submits a Bangladesh Veterinary Council registration number, verified once by an admin, gets `is_verified_vet = true` and can order Rx items without per-order upload. This is the path most of your real volume will take.

> **Verify before launch:** confirm with DGDA / a local regulatory consultant what licence the *selling entity* needs (drug licence, cold-chain licence for biologicals) and what the current rules are on online sale and courier shipment of veterinary drugs. Build the Rx machinery regardless — it is easier to relax than to retrofit.

### 5.6 B2B pricing

Farms, retail pharmacies and clinics buy in volume and expect tiered pricing. Build this in Phase 2, but put the columns in from day one.

```
customer_tiers: retail | vet | pharmacy | farm | distributor
price_tiers: product_id, tier, min_qty, unit_price
```

Plus `credit_limit` and `payment_terms_days` on the customer for distributor accounts. Do not build a full ledger — the accounting SaaS handles that; just record outstanding balance and expose a statement.

---

## 6. Schema sketch (Drizzle)

Core tables. Not exhaustive — treat as the spine.

```
users                  id, phone(unique), email, name, password_hash, locale,
                       tier, is_verified_vet, bvc_reg_no, credit_limit, created_at
addresses              id, user_id, label, recipient_name, phone, division,
                       district, upazila, area, address_line, is_default
admins                 id, email, name, password_hash, is_active, last_login_at
roles                  id, key, name_en, name_bn
permissions            id, key                    -- 'order.refund', 'product.write'
role_permissions       role_id, permission_id
admin_roles            admin_id, role_id
audit_log              id, admin_id, action, entity, entity_id, before, after, ip, at

manufacturers          id, name, country, logo_path
categories             id, parent_id, slug, name_en, name_bn, image_path, sort
products               id, slug, sku, name_en, name_bn, generic_name, product_type,
                       manufacturer_id, category_id, strength, strength_unit,
                       dosage_form, pack_size, pack_unit, target_species[],
                       withdrawal_meat_days, withdrawal_milk_hours,
                       dgda_registration_no, storage_condition, requires_cold_chain,
                       requires_prescription, is_antimicrobial, vat_rate,
                       mrp, sale_price, is_active, search_vector
product_images         id, product_id, base_path, blurhash, alt_en, alt_bn, sort
product_batches        id, product_id, batch_no, mfg_date, expiry_date,
                       qty_received, cost_price, supplier_id
stock_ledger           id, product_id, batch_id, delta, reason, ref_type, ref_id,
                       admin_id, at        -- reason: purchase|sale|return|adjust|expiry

carts                  id, user_id|session_id, updated_at
cart_items             id, cart_id, product_id, qty
orders                 id, order_no, user_id, status, subtotal, discount, vat,
                       shipping, total, payment_method, payment_status,
                       address_snapshot(jsonb), fulfilment_channel, rx_id,
                       placed_at, confirmed_at, cancelled_at
order_items            id, order_id, product_id, batch_id, name_snapshot,
                       generic_snapshot, batch_no, expiry_date, qty,
                       unit_price, vat_rate, line_total,
                       withdrawal_meat_days, withdrawal_milk_hours
order_events           id, order_id, from_status, to_status, actor, note, at

prescriptions          (see §5.5)
shipments              id, order_id, courier, consignment_id, tracking_code,
                       status, cod_amount, last_synced_at, raw(jsonb)
payments               id, order_id, gateway, gateway_txn_id, amount, status, raw
invoices               id, order_id, invoice_no, pdf_path, issued_at
device_sessions        id, user_id, refresh_token_hash, device_name, fcm_token,
                       last_seen_at, revoked_at
otp_requests           id, phone, code_hash, purpose, attempts, expires_at, used_at

settings               key(pk), value(jsonb), group, updated_by, updated_at
translations           id, namespace, key, bn, en, updated_by, updated_at
delivery_zones         id, division, district, upazila, rate, eta_days,
                       cod_enabled, cold_chain_enabled, is_active
homepage_sections      id, type, sort, is_active, config(jsonb)   -- bn/en inside config
coupons                id, code, type, value, min_basket, scope(jsonb), tier_scope,
                       per_user_limit, total_limit, used_count, starts_at, ends_at
```

**Snapshot everything on the order.** Product name, generic, price, VAT rate, batch, expiry, withdrawal period. Orders must be reconstructible years later even if the product is deleted. Regulated goods, non-negotiable.

**Indexes:** `products(search_vector) GIN`, `products USING gin(generic_name gin_trgm_ops)`, `products(target_species) GIN`, `product_batches(product_id, expiry_date)`, `stock_ledger(product_id, batch_id)`, `orders(user_id, placed_at DESC)`, `orders(status) WHERE status IN (...)` partial.

---

## 7. Directory structure

```
app/
  (shop)/                    storefront, SSR/ISR
    page.tsx
    species/[species]/page.tsx
    c/[category]/page.tsx
    p/[slug]/page.tsx
    cart/  checkout/  account/
  (admin)/admin/             admin panel, force-dynamic
    products/ orders/ batches/ prescriptions/ reports/ users/ settings/
  api/v1/                    JSON API — thin wrappers, mobile-facing
    auth/  products/  cart/  orders/  prescriptions/  app/config/
  api/webhooks/
    steadfast/  sslcommerz/

lib/
  services/                  ALL business logic
    products.ts  cart.ts  orders.ts  stock.ts  prescriptions.ts
    pricing.ts   shipping.ts  invoices.ts  auth.ts
  integrations/
    steadfast/  sslcommerz/  sms/
  jobs/                      BullMQ workers + queue defs
  db/                        drizzle schema, migrations, seed
  auth/                      resolveUser, jwt, otp
  validation/                zod schemas (shared, → OpenAPI)
  i18n/                      en.ts, bn.ts

components/  ui/  shop/  admin/
scripts/     backup.sh  restore.sh  import-catalog.ts
```

### Service-layer pattern — the whole point

```ts
// lib/services/products.ts
export async function getProduct(slug: string, opts?: { tier?: Tier }) { /* ... */ }

// app/(shop)/p/[slug]/page.tsx      → await getProduct(slug)          in-process, no HTTP
// app/api/v1/products/[slug]/route.ts → return json(await getProduct(slug))
```

Server Components call services **directly**. Never `fetch()` your own API from a page — that adds a network hop and defeats the reason for using Next.js.

---

## 8. Auth

| | Web | Flutter |
|---|---|---|
| Mechanism | Auth.js v5 cookie session | JWT access + refresh |
| Access token | — | 15 min, in memory |
| Refresh | — | 60 days, `flutter_secure_storage` |
| Revocation | delete session | `device_sessions.revoked_at` |

One resolver, used by every service entry point:

```ts
// lib/auth/resolve.ts
export async function resolveUser(req?: Request) {
  const bearer = req?.headers.get('authorization')?.replace('Bearer ', '');
  if (bearer) return verifyAccessToken(bearer);   // mobile
  return getSessionUser();                        // web cookie
}
```

**Phone + OTP is the primary login.** Bangladeshi customers will not maintain an email password. Email is optional. Endpoints exist from day one even before the app: `POST /api/v1/auth/otp/request`, `/otp/verify`, `/refresh`, `/logout`.

OTP rules: 6 digits, 3 min TTL, max 5 attempts, 60s resend cooldown, rate-limit per phone **and** per IP in Valkey. Store hash only.

Admin auth is a **separate table and separate session cookie**. An admin is not a user with a flag.

---

## 9. API conventions — lock these before writing an endpoint

- **Versioned path:** `/api/v1/`. Impossible to add once an app is in the Play Store.
- **One envelope:**
  ```json
  { "data": {}, "meta": { "cursor": "..." } }
  { "error": { "code": "OUT_OF_STOCK", "message": "...", "field": "items.0" } }
  ```
  Flutter switches on `code` and renders its own Bangla string. Never parse English text client-side.
- **Cursor pagination**, never offset — infinite scroll duplicates items otherwise.
- **`Idempotency-Key` header required on `POST /orders`.** Store in Valkey 24h, replay the response. BD mobile data drops mid-request constantly; without this you get duplicate orders and duplicate Steadfast consignments.
- **Image variants in the payload**, never guessed by the client:
  ```json
  "image": { "thumb": "…avif", "card": "…avif", "detail": "…avif", "blurhash": "L6P…" }
  ```
- **`Accept-Language: bn|en`** drives response messages.
- **ETag on catalog endpoints** — `dio` cache interceptor handles 304s, large win on 3G.
- **`GET /api/v1/app/config`** → `{ min_version, force_update, maintenance, banners }`. Ship it before the app exists or you can never force an update.
- **Rate limit** on Valkey keyed by `user_id ?? ip`; strict on OTP and prescription upload.

### Dart client generation

```
zod schemas → zod-to-openapi → openapi.json → swagger_dart_code_generator → typed Dart
```

Write the schema once. Regenerate models when the API changes. No hand-written `fromJson`.

---

## 10. Images

On upload: `sharp` produces AVIF + WebP at 200 / 400 / 800 / 1600 px, writes to
`/var/www/media/{yyyy}/{mm}/{contentHash}/{size}.{ext}`. DB stores the base path only.

- Content-hash the directory → `Cache-Control: public, max-age=31536000, immutable`, never invalidate.
- Generate a blurhash at upload; use it as the placeholder.
- Max 8 images per product, 10MB upload cap, magic-byte type check (not extension).
- Strip EXIF.
- Processing happens in a BullMQ job, not the request.
- **Prescription images are private.** Store outside `/var/www/media`, serve through an authenticated route handler with a short-lived signed token. Never in the public directory.

---

## 11. Invoice

Playwright HTML → PDF, generated in a job, written to disk, path stored on `invoices`.

- **Bundle Noto Sans Bengali locally and embed it.** Client-side PDF libraries break Bangla conjuncts. Do not use jsPDF.
- Two templates: A4 invoice, 80mm thermal receipt.
- **Every line must print: product name, generic name, batch no, expiry date, qty, unit price.** Plus withdrawal period for any food-animal drug — put it in a bordered warning block, in Bangla, above the totals.
- Invoice number: `INV-{YY}{MM}-{seq}`, sequence from a Postgres sequence, never reused, never gapped.
- If the entity is VAT-registered, structure the line table for **Mushak 6.3** now (BIN, HS code, per-line VAT rate, exclusive/inclusive). Retrofitting this means migrating live orders.

---

## 12. Steadfast integration

Base URL `https://portal.packzy.com/api/v1`, auth via `Api-Key` and `Secret-Key` headers.

Endpoints used: `create_order`, `create_order/bulk-order`, `status_by_cid/{id}`, `status_by_invoice/{invoice}`, `get_balance`, plus their fraud/courier-score report.

Order payload core fields: `invoice`, `recipient_name`, `recipient_phone`, `recipient_address`, `cod_amount`; optional `note`, `alternative_phone`, `item_description`, `delivery_type`.

Rules:
1. **Always a job**, never in-request. Retry with exponential backoff, max 5, then flag for manual admin action.
2. **Consume their webhook** for status updates, and run a **30-minute reconcile cron** as fallback — BD webhooks drop.
3. **Fraud / courier-score check before confirming any COD order.** COD return rates of 20–30% are normal in BD without screening. This is the single highest-ROI feature in the build. Show the score in the admin order view; auto-hold orders below a threshold for a confirmation call.
4. `item_description` must never contain drug names in a way that invites tampering — use a neutral description plus the invoice number.
5. Cold-chain orders **never** go to Steadfast standard. Enforce in `lib/services/shipping.ts`, not in the UI.

---

## 13. Payments

**COD is the default and the majority path.** Optimize it: confirmation SMS, courier fraud score, partial-advance for high-value baskets.

Online: **one aggregator — SSLCommerz or aamarPay** — covering bKash, Nagad, Rocket and cards in a single integration. Direct bKash PGW only when volume justifies the lower per-transaction fee.

- Verify payment **server-side via IPN/webhook**, never trust the browser redirect.
- Store gateway raw payload in `payments.raw` (jsonb).
- Advance-payment requirement is a rule in `lib/services/pricing.ts`: e.g. COD blocked above ৳15,000, or blocked entirely for cold-chain and Rx items.

---

## 14. Admin — full control

**Design goal: after launch, the owner never needs a developer to change how the shop behaves.** Every rate, threshold, label, banner, zone and message is a database row with an admin screen. If you find yourself writing a magic number in a service, it belongs in `settings` instead.

### 14.1 RBAC

Permission-based, not role-string-based. Roles are bundles of permissions; permissions are granular keys like `product.write`, `order.refund`, `stock.adjust`, `prescription.approve`, `settings.write`.

| Role | Scope |
|---|---|
| Super Admin | everything, including roles and settings |
| Pharmacist | prescription queue, Rx orders, withdrawal/dosage content |
| Inventory | products, batches, stock adjustments, suppliers, purchase entry |
| Order Ops | orders, shipments, refunds up to a configurable cap |
| Content | categories, banners, homepage, CMS, media, **translations** |
| Accounts | invoices, payments, reports — read-only on orders |
| Support | read-only orders + customers, can add notes, cannot mutate money |

One server-side middleware resolves permissions; no per-page ad-hoc checks. Roles are editable in the admin — the owner can create new roles and tick permissions without a deploy.

### 14.2 Modules

**Catalog** — products (bilingual fields side by side in one form, not two tabs), categories with drag-reorder, manufacturers, generic-name master, dosage forms, species, bulk CSV import/export, bulk price update, bulk activate/deactivate, duplicate product.

**Inventory** — batch entry (batch no, mfg, expiry, qty, cost, supplier), stock ledger view with reason filter, manual adjustment with mandatory reason note, expiry dashboard (30/60/90 day buckets with value at risk), low-stock alerts with per-product thresholds, stock-take mode.

**Orders** — filterable list, detail view with full timeline, manual status override (logged), edit line items before confirm, partial cancel, refund, reassign batch, add internal note, print invoice / packing slip / thermal receipt, bulk send to courier, courier fraud score inline, COD confirmation-call checklist.

**Prescriptions** — review queue for pharmacist role, side-by-side image viewer + order contents, approve / reject with reason, vet verification queue for BVC registration numbers.

**Customers** — search by phone, tier assignment, verified-vet toggle, credit limit, order history, address book, block/unblock, impersonate (logged, super-admin only).

**Content** — homepage section builder (hero slider, species tiles, category grid, product rails, banner strips — reorderable, each with bn/en copy and its own image), CMS pages, menu builder, FAQ, popup/announcement bar.

**Marketing** — coupons (percent/fixed/free-shipping, per-user limit, min basket, product/category scope, tier scope, date window), flash sale windows, product bundles, abandoned-cart SMS trigger.

**Shipping** — delivery zones (division → district → upazila), per-zone rate and ETA, free-shipping threshold, **cold-chain serviceable zone list**, courier account config, per-zone COD availability.

**Payments** — enable/disable each gateway, gateway credentials, COD rules (max basket value, blocked product types, advance-payment percentage), refund policy text.

**Reports** — sales by day/month/species/category/manufacturer, gross margin, stock valuation, expiry loss, top products, top customers, courier performance (delivered vs returned by zone), antimicrobial sales volume for AMR reporting, VAT summary.

**Settings** — business identity (name, logo, BIN, drug licence no, addresses, hotline), VAT rates, invoice numbering prefix, expiry block threshold per product type, order cut-off time, low-stock defaults, SMS/email template editor with variable placeholders, maintenance mode, `min_version` / `force_update` for the Flutter app.

**Translations** — see §15.4. Content-role admins edit any UI string in both languages from the admin panel.

**System** — admin users, roles & permissions, audit log with diff viewer and filters, job queue status (BullMQ dashboard), failed webhook replay.

### 14.3 Settings storage

```
settings        key (pk), value (jsonb), group, updated_by, updated_at
```

Read through a Valkey-cached `getSetting<T>(key)` helper with a typed registry and compile-time-known defaults. Cache invalidates on write. Never `SELECT` settings per request without the cache.

### 14.4 Audit log

Written on every admin mutation from day one: `admin_id, action, entity, entity_id, before, after, ip, at`. Stock and price disputes between staff are constant in this business; the log is what settles them. Diff viewer in the admin. Never deletable from the UI.

---

## 15. Localization — Bangla & English

### 15.1 Routing

`app/[locale]/…` with **`bn` as the default locale**, `en` as secondary. Use `next-intl`.

- `/` and `/p/enroflox-100` → Bangla
- `/en/p/enroflox-100` → English
- Locale switcher preserves the current path; choice persisted in a cookie, but the URL is always canonical.
- Emit `hreflang` alternates and a per-locale sitemap. Bangla product pages are your SEO asset — most search volume for these products is Bangla or Banglish.

### 15.2 Two kinds of translatable text

| Kind | Where | Editable by |
|---|---|---|
| UI strings (buttons, errors, labels) | `messages/bn.json`, `messages/en.json` + DB override table | admin (§15.4) |
| Content (product names, categories, banners, CMS) | `*_bn` / `*_en` columns | admin |

**Fallback rule, applied in exactly one helper:** `bn → en → key`. Never inline `?? ''`. In admin forms, show a visible "missing Bangla" badge on any record where `name_bn` is empty, and surface a "Missing translations" report.

Product names are frequently *transliterated* rather than translated (`এনরোফ্লক্স-১০০`). Keep both — Bangla users search transliterated brand names.

### 15.3 Numerals & currency — the part that bites

Bangla digits are `০১২৩৪৫৬৭৮৯` and Bangladeshi grouping is lakh/crore style (`১,২০,০০০`, not `১২০,০০০`).

```ts
// lib/i18n/number.ts — the ONLY place numbers become strings
export function fmtNumber(n: number, locale: Locale) {
  return new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(n);
}

export function fmtMoney(paisa: number, locale: Locale) {
  const taka = paisa / 100;
  return locale === 'bn'
    ? `৳${new Intl.NumberFormat('bn-BD', { minimumFractionDigits: 2 }).format(taka)}`
    : `৳${new Intl.NumberFormat('en-BD', { minimumFractionDigits: 2 }).format(taka)}`;
}
```

Rules:

1. **Node must have full ICU.** Node 22 ships it by default — but if it is ever built `small-icu`, `bn-BD` silently falls back to English digits and nobody notices for weeks. **Write a unit test asserting `fmtMoney(120000_00, 'bn') === '৳১,২০,০০০.০০'` and run it in CI.** Same test guards against ICU grouping changes between Node versions.
2. **The Taka sign is `৳` (U+09F3)**, not `Tk` and not `BDT`. Use it in both locales.
3. **Input must accept both scripts.** A user on a Bangla keyboard will type `১২৩`. Normalize before parsing, always:
   ```ts
   // Bengali (০-৯) and Arabic-Indic (٠-٩) → ASCII
   export const normalizeDigits = (s: string) =>
     s.replace(/[০-৯]/g, d => String(d.charCodeAt(0) - 0x09e6))
      .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));
   ```
   Apply in the Zod preprocessor for every numeric and phone field, so it protects the API as well as the forms.
4. **These are ALWAYS Western digits, in both locales, no exceptions:** phone numbers, OTP codes, order numbers, invoice numbers, tracking codes, batch numbers, DGDA registration numbers, TXN ids. They get copy-pasted, read aloud to a hotline, and passed to Steadfast and the SMS gateway — localizing them causes real, hard-to-debug failures.
5. **Quantities and stock counts in admin stay Western** even in Bangla UI. Operators enter data faster in ASCII and the numeric keypad emits ASCII.
6. **Dates:** Gregorian calendar with Bangla month names via `Intl.DateTimeFormat('bn-BD')`. Do not use the Bangla calendar (Poush/Magh) — nobody uses it for commerce. Expiry dates on the invoice print in both scripts: `৩১ ডিসেম্বর ২০২৬ (31 Dec 2026)`.
7. **Invoice PDF follows the customer's locale**, but batch/expiry/invoice numbers stay Western per rule 4.

### 15.4 Admin translation editor

`translations` table: `key, bn, en, namespace, updated_by, updated_at`, overriding the JSON files at runtime with a Valkey-cached merge. Content-role admins can fix a typo or reword a Bangla error message without a deploy. Ship this in Phase 1 — it removes the owner's single most common developer request.

### 15.5 Typography

- **UI Bangla:** Hind Siliguri or Anek Bangla. **UI Latin:** Inter. **PDF:** Noto Sans Bengali, embedded.
- Load with `next/font/local`, self-hosted (**not Google Fonts CDN** — it defeats BDIX), `font-display: swap`, subset and preload only the weights used.
- **Bangla needs `line-height: 1.75–1.85`.** Matras and conjuncts are tall; 1.5 clips them. Set it on the `bn` locale root, not globally.
- **Bangla text runs ~15–25% longer than English.** No fixed-width buttons, no `whitespace-nowrap` on labels, no truncation-dependent layouts. Test every screen in Bangla *first* — if it fits in Bangla it fits in English.
- Never render Bangla below 15px; small Bangla type is unreadable on mid-range Android screens.

---

## 16. Responsive & performance

Roughly 85–90% of BD e-commerce traffic is mobile — mid-range Android, 4G with 3G dead zones, often data-conscious.

### 16.1 Storefront

- **Mobile-first. 360px is the design base**, not 375 and not 390 — the common BD Android viewport is 360×800 CSS px.
- Breakpoints: `360 → 640 (sm) → 768 (md) → 1024 (lg) → 1280 (xl)`.
- Persistent **bottom navigation** on mobile: Home · Species · Search · Cart · Account. Sticky add-to-cart bar on the product page.
- Minimum touch target 44×44px. Bangla labels need extra horizontal padding.
- Product grid: 2 columns at 360, 3 at 640, 4 at 1024, 5 at 1280.
- Filters are a bottom sheet on mobile, a sidebar on desktop.
- Tables never appear on mobile storefront — order history becomes stacked cards.

### 16.2 Admin — must work on a phone

The owner will check orders from a phone at 11pm. Admin is not desktop-only.

- Data tables collapse to cards below `md`, showing 3–4 key fields plus a detail link.
- Priority actions reachable on mobile: order list, order detail, status change, send to courier, prescription approve/reject, stock adjust.
- Complex editors (homepage builder, bulk import, report tables) may be desktop-only — show an explicit "open on a larger screen" message rather than a broken layout.
- Admin tables: sticky header, horizontal scroll with a frozen first column on tablet.

### 16.3 Budget

| Metric | Target |
|---|---|
| LCP on 4G (product page) | < 2.5s |
| Initial JS | < 150KB gzipped |
| Product image (card) | < 30KB AVIF |
| Interaction to Next Paint | < 200ms |

Enforce with a CI bundle-size check. Server Components by default; `'use client'` only for genuinely interactive leaves (cart, filters, image gallery). Product pages are ISR with on-demand revalidation when a product or price changes.

---

## 17. Compliance checklist

- [ ] Selling entity holds the required drug licence for retail/wholesale of veterinary medicines (**confirm with DGDA / regulatory consultant**)
- [ ] DGDA registration number recorded and displayed for every registered drug and vaccine
- [ ] Rx workflow enforced for prescription-only products
- [ ] Withdrawal periods displayed on product page and printed on invoice
- [ ] Batch + expiry traceable from order line back to supplier
- [ ] Antimicrobial products flagged; responsible-use notice shown (AMR stewardship)
- [ ] Cold-chain products restricted to serviceable zones
- [ ] Prescription images stored privately, retention policy defined
- [ ] Mushak 6.3 fields present if VAT-registered

Use the **Bangladesh National Veterinary Formulary (BDNVF, DGDA 2023)** as the reference source when seeding generic names, dosage forms and indications. Do not invent dosage data.

---

## 18. Build phases

**Phase 1 — sellable (target: 6–7 weeks)**
Bilingual routing + numeral formatting + translation editor · responsive storefront (360px base) · catalog with species/generic/Banglish search · batch + expiry + FEFO · cart · COD checkout · phone OTP auth · admin CRUD + RBAC + audit log + settings · Steadfast create + webhook · invoice PDF (bn/en).
*Excludes vaccines, Rx, online payment, B2B tiers.*

**Phase 2 — regulated + paid**
Rx upload & pharmacist review · verified-vet accounts · SSLCommerz · courier fraud score · expiry dashboard · B2B tier pricing · homepage builder · coupons · reports.

**Phase 3 — cold chain + mobile**
Vaccines, cold-chain zones, own-rider fulfilment · OpenAPI freeze → Dart client → Flutter app · FCM push · credit accounts for distributors.

Do not start Phase 2 items during Phase 1. The catalog and stock ledger being correct matters more than feature count.

---

## 19. Commands

```bash
pnpm dev                    # local dev
pnpm build && pnpm start
pnpm db:generate            # drizzle migration from schema
pnpm db:migrate             # apply — NEVER db:push in production
pnpm db:seed                # categories, manufacturers, roles, sample SKUs
pnpm db:seed:demo           # ~120 realistic SKUs, batches, orders in each status
pnpm db:reset:demo          # wipe + reseed, for repeatable demos
pnpm jobs                   # BullMQ workers (separate PM2 process)
pnpm typecheck
pnpm lint
pnpm test
scripts/backup.sh
scripts/restore.sh <dump>
```

PM2 runs two apps: `vetmart-web` (cluster) and `vetmart-jobs` (fork, single instance).

---

## 20. Gotchas — read before debugging

- **BD phone numbers**: normalize to `8801XXXXXXXXX` on write. Accept `01XXXXXXXXX`, `+8801…`, `8801…`. One canonical form in the DB, always.
- **Bangla search**: Postgres has no Bengali stemmer. Use `simple` config + `pg_trgm` similarity, and index a transliterated column so `oxytetracycline` matches `অক্সিটেট্রাসাইক্লিন`. Also index a **Banglish** column — a large share of BD users type `gorur oshudh` in Latin script.
- **ICU is the silent killer**: if Node ever runs `small-icu`, `Intl.NumberFormat('bn-BD')` degrades to English digits with no error. The CI test in §15.3 is what catches it.
- **Digit normalization must run server-side too**, not only in the form. Mobile clients and copy-paste bypass the UI.
- **Never localize identifiers** — order no, invoice no, tracking code, OTP, phone, batch no. Rule §15.3.4 exists because these break Steadfast and SMS delivery in ways that look like network bugs.
- **Bangla line-height**: default `1.5` clips matras and conjuncts. Set `1.8` on the `bn` root.
- **Layout must be tested in Bangla first** — Bangla strings run 15–25% longer, so an English-fitting button will overflow.
- **Self-host fonts.** Google Fonts CDN routes outside BDIX and undoes the hosting decision in §4.1.
- **`prepare: false` is mandatory** with Aiven's PgBouncer transaction pooling. Omitting it fails intermittently under load, not cleanly at startup — the worst failure mode to debug.
- **Vercel region defaults to `iad1`.** If `vercel.json` doesn't pin `bom1`, every demo query does a US↔India round trip and the client concludes the app is slow.
- **`max: 1` on serverless.** A normal pool size on Vercel exhausts Aiven's connection cap during any real demo.
- **Never let a full Cloudinary URL into the database.** Keys only. This single rule is the difference between a 20-minute media migration and a weekend of data repair.
- **Vercel Cron minimum interval is 1 minute**, and Hobby has a daily invocation cap — the demo's courier/SMS latency is up to ~60s by design. Mention it in the demo script instead of engineering around it.
- **Vercel function timeout** is 10s on Hobby. Image processing, bulk import and PDF work must be jobs, never request-path.
- **The OTP mock must be double-gated** (`NODE_ENV` *and* `DEMO_MODE`) with a test asserting it is off in production.
- **Playwright will not fit Vercel's bundle** and `@react-pdf/renderer` cannot shape Bangla conjuncts. Use the HTML print view for demo; do not try a third option.
- **Address hierarchy**: Division → District → Upazila → Union/Area. Seed the real list; free-text districts will destroy your delivery-zone logic.
- **Timezone**: `Asia/Dhaka` is UTC+6, no DST. Store UTC, render Dhaka. Order cut-off times are Dhaka-local.
- **Expiry vs order date**: check expiry at *confirm* time, not cart time. Carts sit for days.
- **Negative stock**: impossible by construction — allocate inside the same transaction as order creation, with `SELECT … FOR UPDATE` on the batch rows.
- **Do not soft-delete products.** Deactivate (`is_active = false`). Order history depends on them existing.
- **`sharp` on Ubuntu**: needs the correct libvips platform binary. Pin the version and install with the matching platform flag in CI/deploy.
- **PM2 + Next.js standalone**: build with `output: 'standalone'`, copy `.next/static` and `public` into the standalone dir, or assets 404 in production.

---

## 21. Escape hatch — if .NET is ever needed

**Expectation: this never happens.** It is documented so that "we should have used .NET" has a written answer, with a specific trigger condition instead of a vibe.

### The trigger

Node handles I/O well and sustained CPU work badly. Everything in this spec is I/O. Revisit only if **all** of these become true:

- a background workload is CPU-bound and runs for minutes, not seconds — e.g. courier reconciliation across 50k+ orders, real-time rider tracking, or reports scanning millions of `stock_ledger` rows;
- it runs often enough to overlap with customer traffic;
- and it is measurably slowing the storefront, because the job and the web server compete for the same cores on the same box.

Symptom to watch for: p95 page latency rising during job windows. Until that shows up in monitoring, do nothing.

### The move — additive, not a rewrite

Add a third process. Do not touch the existing two.

```
BDIX VPS
├── vetmart-web     Next.js   storefront + admin + API      ← unchanged
├── vetmart-jobs    Node      light jobs: SMS, images, PDF  ← unchanged
└── vetmart-worker  .NET 8    heavy background work only    ← new
         all three → same local Postgres
```

The .NET service is a `BackgroundService` with no HTTP routes and no UI. It claims work from the `jobs` table with `FOR UPDATE SKIP LOCKED` — the same mechanism the demo driver uses (§4.2) — and writes results back to the same tables.

Nothing user-facing changes. No page is rewritten. No API contract moves. No Flutter release is required.

### Why this stays possible

Because of §2 rule 1. Business logic lives in `lib/services/*`, and every state change is expressed as **rows in tables** (`stock_ledger`, `jobs`, `shipments`, `order_events`) rather than as side effects buried in HTTP handlers. That makes the database the contract, so a second process in a different language can participate safely.

If order logic had been written inside route handlers, a .NET worker could reuse none of it and this would be an actual rewrite. That is the entire reason rule 1 exists.

### The cost — why the bar is high

Two languages means two toolchains, two deploy paths, two sets of dependency updates, and duplicated domain types that can drift. For a solo maintainer that is a real ongoing tax. Pay it only when the monitoring data says the single-runtime setup has actually failed — not preemptively.
