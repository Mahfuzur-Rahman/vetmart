# Server-Side Persistence Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Executed inline in the originating session.

**Goal:** Make the server the single source of truth for the catalog so a product created on one device is visible on every device, and make every persistence failure loud instead of silent.

**Architecture:** Today the admin writes products to `localStorage` and the storefront reads them back from `localStorage`, with the DB write wrapped in a `catch` that swallows errors and still returns HTTP 200. This plan inverts that: business logic moves into `lib/services/products.ts` (CLAUDE.md §2 rule 1), the API routes become thin authenticated transports that return real errors, and every client component reads exclusively from the API. `localStorage` retains only genuinely client-owned state (the cart).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM + postgres-js, Zod, Vitest, Cloudinary storage driver, Vercel serverless.

**Spec:** `CLAUDE.md` §2 (hard rules), §4.2 (Vercel/Aiven demo target), §4.3 (driver portability), §5.3 (batch/expiry), §9 (API envelope), §14.1 (RBAC).

## Global Constraints

- Business logic never lives in a route handler or page component; it lives in `lib/services/*`. (§2.1)
- Every stock movement is a row in `stock_ledger`. Never mutate a stock column. (§2.3)
- Batch and expiry are mandatory on every drug/vaccine/feed SKU. (§2.4)
- Money is integer paisa in TypeScript, `numeric(12,2)` in Postgres. Never float. (§2.5)
- No service imports a vendor SDK directly; drivers are selected by env. (§2.11)
- `lib/env.ts` validates with Zod at boot and **fails fast** — a missing var must crash the build, not surface as a null at checkout. (§4.3)
- Never let a full Cloudinary URL into the database. Keys only. (§4.2, §20)
- API envelope is `{ data, meta }` / `{ error: { code, message, field } }`. Clients switch on `code`, never on English text. (§9)
- `DEMO_MODE` is explicit. It must never be inferred from a failed DB connection.

---

### Task 1: Environment fail-fast and explicit demo mode

**Files:**
- Modify: `lib/env.ts:12-15` (drop the localhost `DATABASE_URL` default), `lib/env.ts:79` (add superRefine rule)
- Modify: `lib/demo.ts:10-21` (delete the implicit Vercel fallback)
- Modify: `.env.example`
- Test: `tests/env-demo-mode.test.ts`

**Interfaces:**
- Produces: `isDemoMode(): boolean` — true **only** when `DEMO_MODE=true`.
- Produces: `assertRuntimeEnv()` — throws when running on Vercel/production with a localhost `DATABASE_URL` and demo mode off.

**Rationale:** `lib/demo.ts:13-19` currently turns a misconfigured `DATABASE_URL` into "demo mode", which converts a loud connection failure into a silent empty catalog. That is the mechanism that hid this bug for weeks.

- [ ] **Step 1:** Write `tests/env-demo-mode.test.ts` asserting `isDemoMode()` is false when `DEMO_MODE=false` even with `VERCEL=1` and a localhost URL.
- [ ] **Step 2:** Run `pnpm test tests/env-demo-mode.test.ts` — expect FAIL.
- [ ] **Step 3:** Remove the Vercel/localhost branch from `lib/demo.ts`; add the production superRefine to `lib/env.ts`.
- [ ] **Step 4:** Run the test — expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 2: Storage driver selection correctness

**Files:**
- Modify: `lib/storage/index.ts:16-23`
- Test: `tests/storage-driver-selection.test.ts`

**Interfaces:**
- Produces: `getStorageDriver(): StorageDriver` — honours `STORAGE_DRIVER` explicitly; throws `LOCAL_STORAGE_ON_SERVERLESS` when `local` is selected under `VERCEL=1`.

**Rationale:** Two defects. (a) `isCloudinaryConfigured` currently overrides an explicit `STORAGE_DRIVER=local`, so config does not mean what it says. (b) The `local` driver calls `fs.writeFile` into `public/media`, which throws `EROFS` on Vercel's read-only filesystem — silently, inside the upload route's catch.

- [ ] **Step 1:** Write the failing test for explicit-driver precedence and the serverless guard.
- [ ] **Step 2:** Run it — expect FAIL.
- [ ] **Step 3:** Rewrite `getStorageDriver()`.
- [ ] **Step 4:** Run — expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 3: Product write logic moves into the service layer

**Files:**
- Create: `lib/validation/products.ts`
- Modify: `lib/services/products.ts` (append `createProduct`, `updateProduct`, `deleteProduct`)
- Test: `tests/product-input-validation.test.ts`

**Interfaces:**
- Produces: `productCreateSchema` (Zod) with `normalizeDigits` preprocessing on every numeric field per §15.3.3.
- Produces: `createProduct(input: ProductCreateInput): Promise<{ id, slug, sku }>` — runs product + image + batch + ledger inside a single `db.transaction`, so a partial product can never exist.
- Produces: `updateProduct(idOrSlug, input)`, `deleteProduct(idOrSlug)` — both throw `ProductNotFoundError` when no row matches.

**Rationale:** §2 rule 1. The route handler currently holds all the mapping logic, which is why the mobile app path would have to reimplement it. The four inserts are also non-atomic today — a failure after the product insert leaves a product with no batch, which §5.3 forbids from being sold.

- [ ] **Step 1:** Write validation tests (Bengali digit input, paisa coercion, missing batch rejected for drug types).
- [ ] **Step 2:** Run — expect FAIL.
- [ ] **Step 3:** Implement schema + service functions.
- [ ] **Step 4:** Run — expect PASS.
- [ ] **Step 5:** Commit.

---

### Task 4: Admin API routes become thin, authenticated, and loud

**Files:**
- Modify: `app/api/v1/admin/products/route.ts` (whole file)
- Modify: `app/api/v1/admin/products/[id]/route.ts` (whole file)
- Modify: `app/api/v1/admin/upload/route.ts` (add auth)
- Create: `lib/api/guard.ts`

**Interfaces:**
- Consumes: `createProduct` / `updateProduct` / `deleteProduct` from Task 3.
- Produces: `requireAdmin(permission: PermissionKey)` — returns the admin or throws an `ApiGuardError` carrying an envelope code.

**Rationale:** `app/api/v1/admin/products/route.ts:83-85` logs the DB error and then returns `apiSuccess` at line 89 regardless. The admin UI therefore shows "Product created successfully" for a write that never happened. These routes also have **no authentication at all** — any unauthenticated caller can create or delete catalog rows.

- [ ] **Step 1:** Rewrite POST to call `createProduct` and return `apiError('PRODUCT_CREATE_FAILED', …, 500)` on throw.
- [ ] **Step 2:** Rewrite PUT/DELETE to return 404 when the row is absent.
- [ ] **Step 3:** Add `requireAdmin('product.write')` to all three routes; bypass only when `isDemoMode()`.
- [ ] **Step 4:** `pnpm typecheck`.
- [ ] **Step 5:** Commit.

---

### Task 5: Catalog search is demo-aware and does not N+1

**Files:**
- Modify: `lib/services/search.ts:60-200`

**Rationale:** `searchCatalog` has no `isDemoMode()` guard and no error handling, so it throws and `/api/v1/products` returns 500 — which is what pushes every client into its `localStorage` fallback. It also issues two extra queries **per product row** (`lib/services/search.ts:160-180`); with `max: 1` on serverless those serialize, and 100 products means ~200 sequential round trips against Vercel's 10s function limit.

- [ ] **Step 1:** Add the `isDemoMode()` guard returning seed data.
- [ ] **Step 2:** Replace the per-row stock and image queries with two batched `inArray` queries.
- [ ] **Step 3:** `pnpm typecheck` and run the suite.
- [ ] **Step 4:** Commit.

---

### Task 6: Storefront reads only from the server

**Files:**
- Modify: `components/storefront/ProductsCatalogView.tsx:64-89`
- Modify: `components/storefront/FeaturedProductsGrid.tsx:21-53`
- Modify: `components/storefront/SpeciesProductsView.tsx:32-66`
- Modify: `components/storefront/ExpressOrderView.tsx:61-70`
- Modify: `app/[locale]/products/[slug]/page.tsx:31-33`

**Rationale:** Every one of these falls back to `getStoredProducts()`, which is per-browser. Removing the fallback is what actually fixes the reported symptom. An empty catalog must render an empty state, not another device's data.

- [ ] **Step 1:** Delete `getStoredProducts` imports and fallbacks; keep the `PRODUCTS_UPDATED_EVENT` listener but have it re-fetch the API only.
- [ ] **Step 2:** `pnpm typecheck` and `pnpm build`.
- [ ] **Step 3:** Commit.

---

### Task 7: Admin table reads and writes only through the API

**Files:**
- Modify: `components/admin/AdminProductsTable.tsx:22`, `:78-92`, `:280-390`, `:395-430`

**Rationale:** `AdminProductsTable.tsx:362` calls `saveStoredCustomProduct(newProduct)` **before** the API call and ignores the API result, so the admin's own browser shows a product nobody else can see. Success toasts must be gated on `res.ok`.

- [ ] **Step 1:** Remove `saveStoredCustomProduct` / `deleteStoredProduct` / `getStoredProducts` usage.
- [ ] **Step 2:** Gate every toast on the API response; surface `error.code` on failure.
- [ ] **Step 3:** `pnpm typecheck`.
- [ ] **Step 4:** Commit.

---

### Task 8: Demo mode actually demos

**Files:**
- Modify: `lib/mock-data/products.ts:363`

**Rationale:** `MOCK_PRODUCTS` is `[]` while the 8-item `SEED_PRODUCTS` array directly above it is unused by the storefront. With demo mode on, the catalog is empty; with it off, the catalog is empty for a different reason. Pointing `MOCK_PRODUCTS` at `SEED_PRODUCTS` makes `DEMO_MODE=true` a working demo again.

- [ ] **Step 1:** Point `MOCK_PRODUCTS` at `SEED_PRODUCTS`.
- [ ] **Step 2:** Update `tests/products-client-sync.test.ts`, which currently asserts the empty-catalog behaviour.
- [ ] **Step 3:** Run the suite.
- [ ] **Step 4:** Commit.

---

### Task 9: Vercel platform configuration

**Files:**
- Create: `vercel.json`
- Create: `app/api/internal/jobs/tick/route.ts`

**Interfaces:**
- Consumes: `getQueueDriver().process(handler)` from `lib/queue/index.ts`.
- Produces: `GET /api/internal/jobs/tick` guarded by the `JOBS_DRAIN_SECRET` header.

**Rationale:** No `vercel.json` exists, so functions run in `iad1` (Washington DC) against an Aiven DB — CLAUDE.md §4.2 requires pinning `bom1`. The pg-cron queue driver's `process()` has no HTTP entry point, so nothing ever drains the `jobs` table.

- [ ] **Step 1:** Create `vercel.json` with `regions: ["bom1"]` and the cron entry.
- [ ] **Step 2:** Create the tick route with constant-time secret comparison.
- [ ] **Step 3:** `pnpm build`.
- [ ] **Step 4:** Commit.

---

### Task 10: Full verification

- [ ] **Step 1:** `pnpm typecheck`
- [ ] **Step 2:** `pnpm lint`
- [ ] **Step 3:** `pnpm test`
- [ ] **Step 4:** `pnpm build`
- [ ] **Step 5:** Write the Vercel environment-variable checklist into this document's appendix.
- [ ] **Step 6:** Commit.

---

## Appendix: Vercel environment variables required after this change

Because Task 1 removes the silent localhost default, the deploy will now **fail loudly** unless these are set in the Vercel project settings:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Aiven pooled (PgBouncer) connection string, `?sslmode=require` |
| `DB_POOL_MAX` | `1` |
| `DEMO_MODE` | `false` |
| `STORAGE_DRIVER` | `cloudinary` |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | from the Cloudinary console |
| `QUEUE_DRIVER` | `pg-cron` |
| `PDF_DRIVER` | `html-print` |
| `COURIER_DRIVER` | `mock` |
| `SMS_DRIVER` | `mock` |
| `PAYMENT_MODE` | `sandbox` |
| `AUTH_SECRET` / `JWT_SECRET` | fresh 32+ char secrets, not the dev defaults |
| `JOBS_DRAIN_SECRET` | fresh secret |
| `NEXT_PUBLIC_APP_URL` | the deployed origin |

Then run migrations and seed **once** against Aiven from a local shell:

```bash
DATABASE_URL='<aiven-pooled-url>' pnpm db:migrate
DATABASE_URL='<aiven-pooled-url>' pnpm db:seed
```
