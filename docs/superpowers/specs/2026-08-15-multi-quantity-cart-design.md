# Multi-Quantity Cart & Stepper System Design Specification

## Overview
Enable users to seamlessly adjust item quantities when adding products to their cart across VetMart. This includes interactive `[-] [ qty ] [+]` steppers directly on product cards, a dedicated quantity controller and checkout flow on the product details page, and unified client-side cart state management synced with Header badge and Cart view.

---

## 1. User Experience & Interactions

### A. Product Card Stepper (`ProductCard.tsx`)
- **Default State (0 in cart):** Displays the modern `+ Cart` / `+ কার্ট` button.
- **Active State (> 0 in cart):** On click, transforms smoothly into an inline stepper:
  - `[-]` button on the left (decreases quantity; if quantity becomes 0, item is removed from cart and button reverts to `+ Cart`).
  - `[ qty ]` numeric indicator in the center (bilingual numeral support: English / Bengali).
  - `[+]` button on the right (increases quantity up to stock limit).
- **Haptic/Micro-animation:** Smooth scaling transition and tactile hover/press states.
- **Stock Limit Awareness:** `+` disabled if item reaches `sellableStock` or out of stock.

### B. Product Detail Page Quantity Controller (`ProductDetailAddToCart.tsx`)
- Located in `app/[locale]/products/[slug]/page.tsx`.
- **Quantity Selector:** `[-] [ qty ] [+]` with numerical input.
- **Live Pricing Calculation:** Shows subtotal = `salePrice * qty` updating in real-time.
- **Actions:**
  - **"Add to Cart / কার্টে যোগ করুন"** primary button with instant visual feedback and badge animation.
  - **"Buy Now / সরাসরি অর্ডার করুন"** shortcut taking the user directly to checkout with this product and selected quantity.

### C. Unified Cart Context & State Sync (`CartContext.tsx`)
- Store cart items in a lightweight, reactive `CartContext` with `localStorage` persistence (key: `vetmart_cart`).
- Exposes:
  - `items`: array of `{ product, qty }`
  - `itemCount`: total quantity across all items
  - `subtotal`: total price in paisa
  - `addToCart(product, qty)`
  - `updateQty(productId, qty)`
  - `removeFromCart(productId)`
  - `getItemQty(productId)`
  - `clearCart()`
- Automatically synchronizes:
  - Header cart counter badge (`Header.tsx`)
  - All Product Cards (`ProductCard.tsx`)
  - Product Detail Page (`ProductDetailPage`)
  - Cart Page (`CartView.tsx`)

---

## 2. Technical Architecture & File Changes

1. **`lib/context/CartContext.tsx`** [NEW]:
   - Client context providing global cart state, persistent storage, and helper methods.
2. **`app/[locale]/layout.tsx`** [MODIFY]:
   - Wrap the storefront app with `CartProvider`.
3. **`components/storefront/ProductCard.tsx`** [MODIFY]:
   - Hook into `useCart` to determine current quantity for the card's product.
   - Render dynamic `+ Cart` vs `[-] [ qty ] [+]` stepper.
4. **`components/storefront/ProductDetailAddToCart.tsx`** [NEW]:
   - Client component for product detail page with quantity controls, live price calculation, and Add to Cart / Buy Now actions.
5. **`app/[locale]/products/[slug]/page.tsx`** [MODIFY]:
   - Integrate `ProductDetailAddToCart` into the product info column.
6. **`components/storefront/Header.tsx`** [MODIFY]:
   - Read `itemCount` dynamically from `useCart()` so the cart badge updates instantly without page refresh.
7. **`components/storefront/CartView.tsx`** [MODIFY]:
   - Connect to `useCart()` for live quantity edits, deletions, and pricing calculations.

---

## 3. Bilingual Support (i18n)
- Bengali / English numbers formatted with existing `fmtMoney` and bilingual labels (`+ কার্ট`, `কার্টে যোগ করুন`, `সরাসরি অর্ডার করুন`, `স্টকে নেই`).

---

## 4. Verification Plan
1. **Interactive Product Card Test:**
   - Click `+ Cart` on home/catalog page -> verify button morphs into `[-] 1 [+]`.
   - Click `+` -> verify quantity increases to 2, 3... Header badge updates.
   - Click `-` down to 0 -> verify button reverts to `+ Cart` and header counter decrements.
2. **Product Detail Page Test:**
   - Navigate to `/products/[slug]`.
   - Change quantity to 4 -> verify subtotal updates. Click "Add to Cart" -> verify item added to cart and Header badge reflects new count.
3. **Cart Page Sync Test:**
   - Navigate to `/cart` -> verify added items appear with exact quantities, subtotal recalculates, and cold-chain/delivery fees apply accurately.
