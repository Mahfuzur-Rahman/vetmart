# VetMart BD - Standalone Hardcoded Demo Design Document

**Date:** 2026-08-11  
**Target:** VetMart BD Standalone Demo Mode (Zero Database Dependency)

---

## 1. Goal & Context

VetMart BD is a veterinary medicine & animal-health e-commerce platform in Bangladesh serving Farmers, Registered Vets, and Pet Owners. 

To present a fully functional demonstration without requiring an active PostgreSQL database or external backend services, this design establishes a **hardcoded in-memory state and mock data layer**. Every user action (storefront browsing, search, cart, checkout, admin login, order operations, prescription approvals, stock ledger tracking, settings) will be fully clickable and interactive with zero broken links or unhandled errors.

---

## 2. Authentication & Quick-Fill Demo Helpers

### 2.1 Admin Authentication (`/admin/login`)
- **Quick-Fill Credentials Box**: Prominent helper component on the login card with 1-click auto-fill buttons.
- **Pre-configured Accounts**:
  - **Super Admin**: `admin@vetmart.bd` / `Admin123!` (Full permissions)
  - **Pharmacist**: `pharmacist@vetmart.bd` / `Pharmacist123!` (Rx review focus)
- **Session Management**: Cookie / localStorage mock session driver so accessing protected routes (`/admin/*`) succeeds seamlessly.

### 2.2 Storefront Customer Auth
- **Demo Phone**: `01711000000`
- **Demo OTP**: `123456` (displayed on OTP drawer with 1-click autofill button).

---

## 3. Mock Data Specifications (`lib/mock-data/`)

### 3.1 Product Catalog & Image Assets
Every product features embedded high-resolution SVG artwork / vector assets representing veterinary bottles, sachets, and vials:

1. **Renaflox 100ml Oral Solution**
   - **Generic**: Enrofloxacin (100 mg/ml)
   - **Category**: Antibiotics & Antimicrobials
   - **Price**: MRP ৳180.00 | Sale Price ৳165.00
   - **Attributes**: Cold-Chain, Prescription Required (Rx), Batch: `REN-2026-08A`, Exp: `2027-12`
   - **Species**: Poultry 🐓, Cattle 🐄, Goat 🐐

2. **Rena-WS 100g Water Soluble Powder**
   - **Generic**: Multivitamin + Mineral Premix
   - **Category**: Vitamins & Minerals
   - **Price**: MRP ৳120.00 | Sale Price ৳110.00
   - **Attributes**: OTC, Batch: `RWS-99182`, Exp: `2028-04`
   - **Species**: Poultry 🐓, Cattle 🐄

3. **Acimec 1% Injection 10ml**
   - **Generic**: Ivermectin (10 mg/ml)
   - **Category**: Anthelmintics (Dewormers)
   - **Price**: MRP ৳145.00 | Sale Price ৳135.00
   - **Attributes**: Prescription Required (Rx), Batch: `ACM-7712`, Exp: `2027-08`
   - **Species**: Cattle 🐄, Buffalo 🐃, Goat 🐐, Dog 🐕

4. **Eon Cal-P 1L Liquid Supplement**
   - **Generic**: Calcium, Phosphorus & Vitamin D3
   - **Category**: Feed Supplements
   - **Price**: MRP ৳480.00 | Sale Price ৳450.00
   - **Attributes**: OTC, Batch: `EON-CAL-04`, Exp: `2027-11`
   - **Species**: Cattle 🐄, Goat 🐐

5. **Square Vet-C Powder 500g**
   - **Generic**: Ascorbic Acid (Vitamin C 99%)
   - **Category**: Feed Supplements
   - **Price**: MRP ৳350.00 | Sale Price ৳320.00
   - **Attributes**: OTC, Batch: `SQC-8810`, Exp: `2028-01`
   - **Species**: Poultry 🐓, Aqua 🐟

6. **PetCare Shampoo & Grooming Kit**
   - **Generic**: Anti-Tick Herbal Pet Formula
   - **Category**: Pet Care
   - **Price**: MRP ৳950.00 | Sale Price ৳890.00
   - **Attributes**: OTC, Batch: `PET-SK-01`, Exp: `2028-06`
   - **Species**: Pet 🐕 🐈

7. **Veterinary AI Insemination Gun & Sheaths**
   - **Generic**: Stainless Steel AI Applicator
   - **Category**: Veterinary Instruments & AI
   - **Price**: MRP ৳1,400.00 | Sale Price ৳1,250.00
   - **Attributes**: Verified Vet Special Price ৳1,150.00, OTC
   - **Species**: Cattle 🐄

### 3.2 Orders Dataset
5+ realistic orders in different workflow states:
- `VM-BD-98214`: Pending Pharmacist Rx Review (Customer: Dr. Anisur Rahman, Vet)
- `VM-BD-98213`: Dispatched / Out for Delivery (Customer: Rahim Poultry Farm, Gazipur)
- `VM-BD-98212`: Delivered (Customer: Tanvir Ahmed, Dhanmondi, Dhaka)
- `VM-BD-98211`: Pending COD Confirmation (Customer: Kashem Dairy, Bogura)

### 3.3 Prescriptions Dataset
- Sample prescription uploads showing Rx image preview, Doctor Name, BVC Registration Number (e.g. `BVC-REG-10492`), species treated, and prescription status controls (`pending`, `approved`, `rejected`).

### 3.4 Stock Ledger Dataset
- Opening stock records, recent dispatches, and adjustment logs for audit traceability.

---

## 4. Route & Clickability Map

### Storefront Routes
- `/` (Home page with banner slideshow, species tabs, fast OTC/Rx categories)
- `/products` (Catalog grid with live generic search & filters)
- `/products/[slug]` (Product detail page with batch & expiry tags, Rx alert, quantity controls, add-to-cart, buy now)
- `/species/[slug]` (Species specific views)
- `/cart` (Cart drawer + dedicated cart page with subtotal, cold-chain fee, coupon code input)
- `/checkout` (Multi-step checkout with recipient address, BD division/district pickers, bKash/Nagad/COD option, and instant Order Confirmation modal)

### Admin Routes
- `/admin/login` (Auto-fill demo credentials, login form)
- `/admin` (Dashboard analytics, metric cards, recent orders)
- `/admin/orders` (Order management table, order detail drawer, status changer)
- `/admin/products` (Product inventory table, stock status badges)
- `/admin/prescriptions` (Prescription review queue, image lightbox preview, Approve/Reject buttons)
- `/admin/stock` (Audit stock ledger table)
- `/admin/customers` (Customer list with Vet verification badges)
- `/admin/settings` (Delivery charges & cold chain shipping config toggles)

---

## 5. Verification & Acceptance Criteria
1. Clicking "Log in as Super Admin" on `/admin/login` immediately fills credentials and navigates into `/admin`.
2. All storefront product cards render custom high-contrast SVG product art without any missing image broken link icons.
3. Adding products to cart, editing quantities, clicking Checkout, and placing an order generates a valid demo order confirmation screen.
4. Admin panel tabs (`Orders`, `Products`, `Prescriptions`, `Stock`, `Customers`, `Settings`) navigate smoothly and respond to action clicks (e.g., status changes, prescription approvals).
5. Zero runtime errors or unhandled page crashes.
