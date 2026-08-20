# Anonymous Cart Lead Capture & Priority Phone Design

## 1. Overview & Problem Statement
Currently, customers can add multiple products to their cart and navigate to `/checkout`. If they begin entering their phone number and shipping details but abandon the page before clicking "Place Order", their cart items and contact info are lost because `CheckoutForm.tsx` does not auto-sync draft leads to the database.

Furthermore, the phone number field was buried beneath recipient name and autofill demo buttons. 

This design establishes:
1. **Priority Phone Number Input**: Elevated to the top of the checkout form with high-contrast badge indicators (`[বাধ্যতামূলক / Required]`), `🇧🇩 +880` prefix styling, and instant validation checkmarks.
2. **Instant Debounced Incomplete Order Capture**: As soon as a valid 11-digit Bangladesh phone number (`isValidBdPhone`) is entered, the full cart payload is debounced (600ms) and saved directly to the PostgreSQL `incomplete_orders` table via `POST /api/v1/incomplete-orders`.
3. **Continuous Field Sync**: As the user types their Name, Division, District, Upazila, and Address, background updates keep the database lead record synchronized without blocking the UI.
4. **Clean Aesthetics & Zero-Demo Ergonomics**: Complete removal of synthetic autofill buttons and alignment with the Taste-Skill standard.

---

## 2. Architecture & Data Flow

```
[Customer on /checkout with Items in Cart]
        │
        ▼ (Enters 11-Digit BD Phone)
[isValidBdPhone(phone) === true]
        │
        ▼ (Debounced 600ms Background POST /api/v1/incomplete-orders)
[PostgreSQL: incomplete_orders table] ────► [Admin Panel: /admin/orders (Incomplete Orders)]
        │                                        │ (1-Click Call / WhatsApp)
        ▼ (Customer completes checkout)
[POST /api/v1/orders/express]
        │
        ▼ (Lead marked converted / Order placed)
[Order Confirmation View]
```

---

## 3. UI Component Specifications (`components/storefront/CheckoutForm.tsx`)

1. **Top Priority Phone Card**:
   - Prominent container with subtle border highlight (`border-emerald-500/30` or `border-primary/40`).
   - Title: `মোবাইল নম্বর (অর্ডার কনফার্মেশনের জন্য)` / `Mobile Phone Number (For Order Confirmation)`.
   - Badge: `বাধ্যতামূলক` / `Required`.
   - Input: Monospace font, auto-formatted, with green tick `✓` when valid.
   - Lead capture indicator: Subtle status text (`✓ সুরক্ষিতভাবে সংরক্ষিত` / `✓ Draft saved`) fading out smoothly.

2. **Recipient & Shipping Address Section**:
   - Recipient Name (`প্রাপকের নাম / খামারের নাম`).
   - Division (`বিভাগ`), District (`জেলা`), Upazila (`উপজেলা`).
   - Detailed Address (`পূর্ণাঙ্গ ঠিকানা`).

3. **Payment Method & Summary**:
   - Cash on Delivery (COD), bKash, Nagad selectors.
   - Transparent subtotal, cold-chain fee, delivery fee, and grand total.
   - "অর্ডার নিশ্চিত করুন →" / "Place Order Now →" submit CTA.

---

## 4. Testing & Verification Plan

1. **Unit & Schema Tests**:
   - `tests/incomplete-orders-schema.test.ts`: Verify phone validation & formatting for all BD telecom prefixes (013, 014, 015, 016, 017, 018, 019).
   - `tests/incomplete-orders-api.test.ts`: Verify anonymous cart lead payload validation with multi-item arrays.
2. **Integration Verification**:
   - `npm test`: Verify all 18 test suites pass.
   - `npm run typecheck`: Ensure 0 TypeScript errors.
