# Social Media Express Order Landing & Incomplete Order Lead Recovery System

**Date:** 2026-08-17  
**Status:** Approved  
**Scope:** Storefront Express Order Landing (`/order/[slug]`), Real-time Incomplete Order Capture Engine, and Admin Incomplete Orders / Lead Recovery Operations Board.

---

## 1. Overview & Business Intent

When running social media campaigns (Facebook, Instagram, TikTok, YouTube), users click "Order Now" to purchase a featured veterinary product. Traditional e-commerce flows (login gates, multi-step cart pages) cause high drop-off rates.

This system provides:
1. **Express 1-Page Order Landing (`/[locale]/order/[slug]` & `/[locale]/order`)**:
   - Zero-login guest checkout.
   - Pre-loaded product details, pack quantity selector, live delivery fee calculation, and direct COD/bKash checkout on a single high-converting page.
   - Automatic capture of marketing attribution query parameters (`utm_source`, `utm_campaign`, `utm_medium`).
2. **Real-time Incomplete Order / Abandoned Lead Capture**:
   - As soon as a visitor types an 11-digit Bangladesh phone number, the system captures a lead record with their phone, name, address, selected items, and total amount.
   - Updates progressively as the customer fills additional fields.
   - Automatically marks as `converted` when the customer completes checkout.
3. **Admin Incomplete Orders & Lead Recovery Hub**:
   - Live tab in Admin Orders dashboard showing all pending incomplete leads.
   - Direct 1-click **Call** (`tel:`), 1-click **WhatsApp** (pre-composed recovery template in Bengali & English), **Convert to Placed Order**, and **Discard** capabilities.

---

## 2. Architecture & Data Flow

```
[Social Media Ad] 
      │ (Clicks "Order Now" with UTMs)
      ▼
[/order/renaflox-100ml] (1-Page Express Landing)
      │
      ├─► [User enters 11-digit phone number]
      │        │
      │        ▼ (Debounced POST /api/v1/incomplete-orders)
      │   [incomplete_orders table / localStorage]
      │        │
      │        ▼
      │   [Admin Dashboard -> "Incomplete Orders" Tab] ──► [Admin Calls / WhatsApps Customer]
      │
      └─► [User clicks "Place Order Now"]
               │
               ▼ (POST /api/v1/orders or Express Submit)
          [orders table: Status = 'pending'/'placed']
          [incomplete_orders table: Status = 'converted']
```

---

## 3. Database Schema

### Table: `incomplete_orders` (`lib/db/schema/orders.ts`)

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `uuid` | PK | Unique identifier |
| `phone` | `text` | NOT NULL | Customer phone number (indexed) |
| `name` | `text` | NULL | Customer name (if entered) |
| `address` | `text` | NULL | Street / farm address |
| `division` | `text` | NULL | Division (e.g. Dhaka, Rajshahi) |
| `district` | `text` | NULL | District |
| `upazila` | `text` | NULL | Upazila |
| `items` | `jsonb` | NOT NULL | Array of selected items (product ID, slug, name, pack, qty, unitPrice) |
| `subtotal` | `integer` | NOT NULL | Amount in paisa |
| `deliveryFee` | `integer` | NOT NULL | Delivery fee in paisa |
| `totalAmount` | `integer` | NOT NULL | Total in paisa |
| `utmSource` | `text` | NULL | Marketing source (e.g., `facebook`, `instagram`) |
| `utmCampaign` | `text` | NULL | Campaign name |
| `utmMedium` | `text` | NULL | Medium (e.g., `cpc`, `social`) |
| `status` | `text` | NOT NULL | `'incomplete'`, `'contacted'`, `'converted'`, `'discarded'` (default: `'incomplete'`) |
| `adminNotes` | `text` | NULL | Notes recorded by admin during follow-up call |
| `createdAt` | `timestamp` | NOT NULL | Timestamp created |
| `updatedAt` | `timestamp` | NOT NULL | Timestamp last updated |

---

## 4. Frontend Components & Pages

### 4.1 Express Order Landing (`app/[locale]/order/[slug]/page.tsx` & `components/storefront/ExpressOrderView.tsx`)
- Server page fetching the target product by slug with fallback to mock data / demo mode.
- Client component `ExpressOrderView`:
  - **Product Showcase**: Large clean image, DGDA approval seal, cold-chain/Rx warning if applicable, dosage & withdrawal safety notices.
  - **Pack & Quantity Picker**: Easy +/- controls and quick bulk presets (1, 2, 5, 10 units).
  - **Express Checkout Form**:
    - Mobile Phone (validated with Bangladesh pattern `01[3-9]\d{8}`).
    - Full Name.
    - Division, District, Upazila dropdowns & Address.
    - Payment Method Selector (COD default, bKash, Nagad).
  - **Real-Time Capture Hook**: Fires debounced API call to `/api/v1/incomplete-orders` on phone number entry and updates.
  - **Submission Flow**: Converts order to confirmed order, shows success receipt with tracking reference, and updates cart state.

### 4.2 Generic Quick Order Portal (`app/[locale]/order/page.tsx`)
- Allows landing on `/order` without a slug, featuring top campaign products (Renaflox, Rena-WS, Electromin, Cal-D-Plex) for quick selection and instant checkout.

### 4.3 Admin Incomplete Orders Hub (`components/admin/AdminIncompleteOrdersBoard.tsx` & updated `AdminOrdersBoard.tsx`)
- Integrated into the Admin Orders page as a first-class filter tab: **"অসম্পূর্ণ অর্ডার (Incomplete / Leads)"**.
- Highlights:
  - Total lead count, potential lost revenue in BDT, and conversion recovery metrics.
  - Interactive table:
    - Customer details (Phone, Name).
    - Abandoned products & quantity.
    - Potential revenue amount.
    - Elapsed time (e.g., "5 mins ago", "1 hour ago").
    - Lead source badge (`Facebook`, `Instagram`, `Direct`).
    - **Actions**:
      - 📞 Call (`tel:...`)
      - 💬 WhatsApp (opens `https://wa.me/8801...?text=...`)
      - ⚡ Convert to Confirmed Order (moves item to active orders queue)
      - 🗑️ Discard Lead

---

## 5. API Endpoints

1. **`POST /api/v1/incomplete-orders`**
   - Public endpoint (no auth required).
   - Validates phone and items. Creates or updates existing incomplete order by phone & session.
2. **`GET /api/v1/admin/incomplete-orders`**
   - Admin-protected endpoint returning list of incomplete orders with filtering by status (`incomplete`, `contacted`, `converted`, `discarded`).
3. **`PATCH /api/v1/admin/incomplete-orders/[id]`**
   - Admin-protected endpoint to update status, add notes, or convert to confirmed order.

---

## 6. Testing & Verification Plan

1. **Unit & Component Testing**:
   - Test phone number validation and trigger logic for incomplete order capture.
   - Test pricing calculations (subtotal + cold chain + dynamic division delivery fee).
2. **End-to-End Verification via Browser Subagent**:
   - Navigate to `/bn/order/renaflox-100ml?utm_source=facebook&utm_campaign=winter_promo`.
   - Enter phone number `01712345678` and name `Kamal Hossain`.
   - Verify that the incomplete order is captured immediately in storage and visible in `/bn/admin/orders` under "Incomplete Orders".
   - Complete checkout and verify that the incomplete record converts to placed status.
   - Test Admin actions (WhatsApp template generator, Call link, Convert button).
