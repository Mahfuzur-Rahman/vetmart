# Hardcoded Standalone Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a complete, standalone, database-independent demo of VetMart BD with rich hardcoded mock datasets, SVG veterinary product artwork, quick 1-click admin login helpers, and fully working click-through interactions across storefront and admin panel.

**Architecture:** Create dedicated mock fixture modules in `lib/mock-data/` providing product catalog, orders, prescription requests, stock ledger logs, and mock authentication drivers. Update Next.js App Router pages to consume these mock stores cleanly with interactive client-side state.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons, `next-intl`.

## Global Constraints

- Zero external DB dependency for demo mode.
- All product images use clean inline/embedded SVG vector graphics representing veterinary packaging (no broken image icons).
- Bangladesh veterinary domain accuracy (DGDA reg numbers, batch/expiry info, cold chain indicators, Rx requirements, paisa currency conversion).
- Mobile-first, 360px minimum width layout compatibility across storefront and admin.

---

### Task 1: Mock Data Fixtures & SVG Artwork (`lib/mock-data/`)

**Files:**
- Create: `lib/mock-data/products.ts`
- Create: `lib/mock-data/orders.ts`
- Create: `lib/mock-data/prescriptions.ts`
- Create: `lib/mock-data/stock.ts`
- Create: `lib/mock-data/categories.ts`

**Interfaces:**
- Consumes: None
- Produces: `MOCK_PRODUCTS`, `MOCK_ORDERS`, `MOCK_PRESCRIPTIONS`, `MOCK_STOCK_LEDGER`, `MOCK_CATEGORIES`, helper functions `getProductBySlug(slug)`, `searchProducts(query)`

- [ ] **Step 1: Create `lib/mock-data/categories.ts` with BD veterinary categories & species list**
- [ ] **Step 2: Create `lib/mock-data/products.ts` containing 7+ detailed SKUs with embedded SVG image data URIs**
- [ ] **Step 3: Create `lib/mock-data/orders.ts` containing 5 sample orders across all lifecycle states**
- [ ] **Step 4: Create `lib/mock-data/prescriptions.ts` containing 3 sample Rx verification requests**
- [ ] **Step 5: Create `lib/mock-data/stock.ts` containing batch movement audit logs**
- [ ] **Step 6: Run `npm run typecheck` to verify no TypeScript compilation errors in fixtures**

---

### Task 2: Mock Admin Authentication & Quick-Fill Demo Helpers

**Files:**
- Create: `lib/mock-data/auth.ts`
- Modify: `app/[locale]/admin/login/page.tsx`

**Interfaces:**
- Consumes: `lib/mock-data/auth.ts`
- Produces: `mockAdminLogin(email, password)`, `getMockSession()`, `quickFillAdminCredentials(role)`

- [ ] **Step 1: Create `lib/mock-data/auth.ts` with super_admin (`admin@vetmart.bd`) and pharmacist (`pharmacist@vetmart.bd`) credentials and mock cookie session setter**
- [ ] **Step 2: Update `app/[locale]/admin/login/page.tsx` with prominent 1-click Quick Login Helper card**
- [ ] **Step 3: Add click handlers to automatically populate fields and log in on 1-click**
- [ ] **Step 4: Verify navigation from `/admin/login` to `/admin` dashboard works on click**

---

### Task 3: Storefront Data Integration & Full Interaction Flow

**Files:**
- Modify: `app/[locale]/page.tsx`
- Modify: `app/[locale]/products/page.tsx`
- Modify: `app/[locale]/products/[slug]/page.tsx`
- Modify: `app/[locale]/cart/page.tsx`
- Modify: `app/[locale]/checkout/page.tsx`

**Interfaces:**
- Consumes: `MOCK_PRODUCTS`, `MOCK_CATEGORIES`, cart state
- Produces: Fully interactive catalog, live generic search, cart management, address selector, checkout confirmation modal

- [ ] **Step 1: Update Homepage (`app/[locale]/page.tsx`) to pull from mock products, species pills, and category lists with crisp SVG images**
- [ ] **Step 2: Update Products Catalog (`app/[locale]/products/page.tsx`) with instant generic autocomplete & species/category filter tabs**
- [ ] **Step 3: Update Product Detail Page (`app/[locale]/products/[slug]/page.tsx`) with batch/expiry badges, Rx alert, quantity controls, add to cart**
- [ ] **Step 4: Update Cart Page (`app/[locale]/cart/page.tsx`) and Cart Drawer with dynamic subtotal recalculation, item removal**
- [ ] **Step 5: Update Checkout Page (`app/[locale]/checkout/page.tsx`) with BD division/district pickers, bKash/Nagad/COD radio pickers, order placement modal**

---

### Task 4: Admin Panel Data Integration & Operations Audit

**Files:**
- Modify: `app/[locale]/admin/page.tsx`
- Modify: `app/[locale]/admin/orders/page.tsx`
- Modify: `app/[locale]/admin/products/page.tsx`
- Modify: `app/[locale]/admin/prescriptions/page.tsx`
- Modify: `app/[locale]/admin/stock/page.tsx`
- Modify: `app/[locale]/admin/settings/page.tsx`

**Interfaces:**
- Consumes: `MOCK_ORDERS`, `MOCK_PRODUCTS`, `MOCK_PRESCRIPTIONS`, `MOCK_STOCK_LEDGER`
- Produces: Fully clickable admin dashboard, status change drawer, prescription lightbox & approval, stock audit view

- [ ] **Step 1: Update Admin Overview (`app/[locale]/admin/page.tsx`) with live metric stats and recent orders table**
- [ ] **Step 2: Update Orders Management (`app/[locale]/admin/orders/page.tsx`) with status filters and interactive status update drawer**
- [ ] **Step 3: Update Products Inventory (`app/[locale]/admin/products/page.tsx`) with stock level badges and batch details**
- [ ] **Step 4: Update Prescriptions Review (`app/[locale]/admin/prescriptions/page.tsx`) with Rx image lightbox and Approve/Reject toggles**
- [ ] **Step 5: Update Stock Ledger (`app/[locale]/admin/stock/page.tsx`) with batch movement audit trail**
- [ ] **Step 6: Update Settings Page (`app/[locale]/admin/settings/page.tsx`) with shipping charges editor and cold chain toggle controls**

---

### Task 5: Verification, Build & Visual Quality Check

- [ ] **Step 1: Run `npm run typecheck` to verify no compilation errors**
- [ ] **Step 2: Run `npm run build` to ensure all routes render cleanly for production demo**
- [ ] **Step 3: Verify storefront to admin navigation flows, cart checkout, and login buttons**
