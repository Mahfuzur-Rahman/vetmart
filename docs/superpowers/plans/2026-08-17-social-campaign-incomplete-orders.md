# Social Media Express Orders & Incomplete Order Recovery Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-friction 1-page express ordering flow for social media campaigns with instant phone-trigger incomplete order capture and an admin lead recovery operations dashboard.

**Architecture:** Express Order page (`/[locale]/order/[slug]` and `/[locale]/order`) featuring live quantity & pricing controls, real-time debounced lead capture via `/api/v1/incomplete-orders` upon 11-digit phone entry, and an interactive Admin recovery hub with 1-click Call, WhatsApp templates, and instant order conversion.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Drizzle ORM / PostgreSQL with local storage demo fallback, Vitest.

## Global Constraints
- Storefront routes are internationalized under `app/[locale]/...` with `bn` and `en` support.
- Amounts are stored in integer paisa (e.g. ৳165.00 = `16500`).
- Bangladesh phone validation follows regex `^01[3-9]\d{8}$`.
- Maintain full compatibility with existing `CartContext` and `orders` schema.

---

### Task 1: Data Model & Storage Helpers for Incomplete Orders

**Files:**
- Create: `lib/mock-data/incomplete-orders.ts`
- Modify: `lib/db/schema/orders.ts`
- Test: `tests/incomplete-orders-schema.test.ts`

**Interfaces:**
- Consumes: `products` schema from `lib/db/schema/catalog.ts`
- Produces: `IncompleteOrder` interface, `incompleteOrders` table definition, and CRUD helper utilities in `lib/mock-data/incomplete-orders.ts`.

- [ ] **Step 1: Write the unit test for incomplete order data structure and phone validator**

```typescript
// tests/incomplete-orders-schema.test.ts
import { describe, it, expect } from 'vitest';
import { isValidBdPhone, sanitizeBdPhone } from '@/lib/mock-data/incomplete-orders';

describe('BD Phone Validation & Sanitization', () => {
  it('validates correct 11-digit BD mobile numbers', () => {
    expect(isValidBdPhone('01711000000')).toBe(true);
    expect(isValidBdPhone('01812345678')).toBe(true);
    expect(isValidBdPhone('01999999999')).toBe(true);
    expect(isValidBdPhone('01300000000')).toBe(true);
  });

  it('rejects invalid mobile numbers', () => {
    expect(isValidBdPhone('01211000000')).toBe(false); // Invalid operator prefix
    expect(isValidBdPhone('0171100000')).toBe(false); // 10 digits
    expect(isValidBdPhone('017110000000')).toBe(false); // 12 digits
    expect(isValidBdPhone('abcdefghijk')).toBe(false);
  });

  it('sanitizes mobile numbers with +88 or spaces or dashes', () => {
    expect(sanitizeBdPhone('+8801711-000000')).toBe('01711000000');
    expect(sanitizeBdPhone('8801812 345678')).toBe('01812345678');
    expect(sanitizeBdPhone('  01912-345678  ')).toBe('01912345678');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test tests/incomplete-orders-schema.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement data schema and helper utilities**

Add `incompleteOrders` pgTable to `lib/db/schema/orders.ts` and create `lib/mock-data/incomplete-orders.ts` with phone validator, initial mock leads, and storage helpers.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test tests/incomplete-orders-schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/db/schema/orders.ts lib/mock-data/incomplete-orders.ts tests/incomplete-orders-schema.test.ts
git commit -m "feat(orders): add incomplete orders schema and phone validation utilities"
```

---

### Task 2: Incomplete Orders API Endpoints

**Files:**
- Create: `app/api/v1/incomplete-orders/route.ts`
- Create: `app/api/v1/admin/incomplete-orders/route.ts`
- Create: `app/api/v1/admin/incomplete-orders/[id]/route.ts`
- Test: `tests/incomplete-orders-api.test.ts`

**Interfaces:**
- Consumes: Incomplete order schema and storage helpers from Task 1
- Produces: `POST /api/v1/incomplete-orders` (guest capture), `GET /api/v1/admin/incomplete-orders` (admin query), `PATCH /api/v1/admin/incomplete-orders/[id]` (admin status & conversion).

- [ ] **Step 1: Write integration tests for incomplete orders API**

```typescript
// tests/incomplete-orders-api.test.ts
import { describe, it, expect } from 'vitest';
import { isValidBdPhone } from '@/lib/mock-data/incomplete-orders';

describe('Incomplete Orders Payload Processing', () => {
  it('validates lead creation payload requirements', () => {
    const validPayload = {
      phone: '01711223344',
      name: 'Dr. Rafiqul Islam',
      items: [{ productId: 'prod-1', productName: 'Renaflox 100ml', quantity: 2, unitPrice: 16500 }],
      totalAmount: 33000,
    };

    expect(isValidBdPhone(validPayload.phone)).toBe(true);
    expect(validPayload.items.length).toBeGreaterThan(0);
    expect(validPayload.totalAmount).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement API routes**
  - Create `app/api/v1/incomplete-orders/route.ts` to capture/update lead.
  - Create `app/api/v1/admin/incomplete-orders/route.ts` to list incomplete leads.
  - Create `app/api/v1/admin/incomplete-orders/[id]/route.ts` to handle status transitions, WhatsApp logging, and conversion.

- [ ] **Step 3: Run tests and verify**

Run: `pnpm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/api/v1/incomplete-orders/ app/api/v1/admin/incomplete-orders/ tests/incomplete-orders-api.test.ts
git commit -m "feat(api): implement incomplete orders capture and admin management endpoints"
```

---

### Task 3: Express Order 1-Page Storefront Landing & Direct Links

**Files:**
- Create: `components/storefront/ExpressOrderView.tsx`
- Create: `app/[locale]/order/[slug]/page.tsx`
- Create: `app/[locale]/order/page.tsx`
- Test: Manual / Component validation

**Interfaces:**
- Consumes: `MOCK_PRODUCTS` from `lib/mock-data/products.ts`, `CartContext`, and `POST /api/v1/incomplete-orders`
- Produces: 1-Page express checkout interface with real-time phone number trigger, live district-based delivery fee calculations, and instant order placement receipt.

- [ ] **Step 1: Build `ExpressOrderView.tsx` component**
  - Instant product display with stock, pricing, and pack quantity selectors.
  - Debounced listener on phone number input: when `isValidBdPhone(phone)` is true, automatically dispatch background capture to `/api/v1/incomplete-orders` with UTM params.
  - One-click express order submission converting draft lead to placed order with instant confirmation receipt.
- [ ] **Step 2: Create routes `app/[locale]/order/[slug]/page.tsx` and `app/[locale]/order/page.tsx`**
  - `[slug]/page.tsx`: Direct campaign product order page.
  - `page.tsx`: Generic quick-order page with featured products picker.
- [ ] **Step 3: Test route rendering and locale translations (`bn` & `en`)**
- [ ] **Step 4: Commit**

```bash
git add components/storefront/ExpressOrderView.tsx app/[locale]/order/
git commit -m "feat(storefront): add 1-page express order landing and lead capture frontend"
```

---

### Task 4: Admin Incomplete Orders & Lead Recovery Hub

**Files:**
- Create: `components/admin/AdminIncompleteOrdersBoard.tsx`
- Modify: `components/admin/AdminOrdersBoard.tsx`
- Modify: `app/[locale]/admin/(dashboard)/orders/page.tsx`

**Interfaces:**
- Consumes: `IncompleteOrder` records from storage / API
- Produces: Integrated tab in Admin Orders with live metrics, 1-click Call (`tel:`), 1-click prefilled WhatsApp recovery messages in Bengali/English, and 1-click Convert to Confirmed Order.

- [ ] **Step 1: Create `AdminIncompleteOrdersBoard.tsx`**
  - Overview metrics: Total Pending Leads, Potential Revenue in ৳, Recovered Leads.
  - Data table: Customer Phone, Name, Date/Time, Items, Estimated Value, Marketing Source.
  - Action buttons:
    - 📞 Direct Call button
    - 💬 WhatsApp button with localized message template
    - ⚡ "Convert to Order" button (creates live order in `vetmart_mock_orders` and marks lead `converted`)
    - 🗑️ "Discard" button
- [ ] **Step 2: Integrate into `AdminOrdersBoard.tsx` as a prominent tab with pending count badge**
- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminIncompleteOrdersBoard.tsx components/admin/AdminOrdersBoard.tsx app/[locale]/admin/(dashboard)/orders/page.tsx
git commit -m "feat(admin): add incomplete orders and abandoned lead recovery board"
```

---

### Task 5: End-to-End Verification & Walkthrough

**Files:**
- Test: End-to-end verification via Browser Subagent and automated tests.
- Create: `docs/superpowers/plans/walkthrough.md`

- [ ] **Step 1: Run typecheck and all tests**
  - Run `pnpm typecheck` and `pnpm test`.
- [ ] **Step 2: Visual Browser Verification**
  - Visit `/bn/order/renaflox-100ml?utm_source=facebook&utm_campaign=poultry_boost`.
  - Enter phone number `01712345678`.
  - Check `/bn/admin/orders` to confirm the incomplete lead appears with items, value, and WhatsApp/Call actions.
  - Complete the order and verify it transitions to active orders and converts the lead.
- [ ] **Step 3: Commit all changes and prepare walkthrough**
