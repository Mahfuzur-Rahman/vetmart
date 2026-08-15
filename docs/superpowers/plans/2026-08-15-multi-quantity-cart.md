# Multi-Quantity Cart & Stepper System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an interactive quantity stepper on product cards and product detail pages allowing users to select multiple quantities when adding items to cart, with full real-time state synchronization across Header badges, Product Detail pages, and Cart view.

**Architecture:** A client-side `CartContext` with `localStorage` persistence and fallback mock/API synchronization powers global cart state. `ProductCard` switches dynamically between a "+ Cart" button and an interactive `[-] [ qty ] [+]` stepper. `ProductDetailPage` gains a full interactive `ProductDetailAddToCart` component with quantity stepper, live subtotal computation, and Add to Cart / Order Now actions.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, next-intl.

## Global Constraints
- Modern medical-grade e-commerce UI design adhering to Taste-Skill anti-slop rules.
- Fully responsive across desktop, tablet, and mobile viewport sizes.
- Full bilingual English/Bengali number formatting and text support.

---

### Task 1: Create Global Cart State Management (`CartContext`)

**Files:**
- Create: `lib/context/CartContext.tsx`
- Modify: `app/[locale]/layout.tsx`

**Interfaces:**
- Produces: `CartProvider`, `useCart()` with `{ items, itemCount, subtotal, addToCart, updateQty, removeFromCart, getItemQty, clearCart }`

- [ ] **Step 1: Create CartContext with localStorage persistence and reactive updates**
- [ ] **Step 2: Wrap Root Layout with `CartProvider`**
- [ ] **Step 3: Verify TypeScript builds without errors**

---

### Task 2: Implement Interactive Stepper in `ProductCard`

**Files:**
- Modify: `components/storefront/ProductCard.tsx`

**Interfaces:**
- Consumes: `useCart()` from `@/lib/context/CartContext`
- Produces: Smooth morphing button from `+ Cart` to `[-] [ qty ] [+]` stepper

- [ ] **Step 1: Connect `ProductCard` to `useCart`**
- [ ] **Step 2: Render compact stepper when item quantity > 0**
- [ ] **Step 3: Handle quantity increment, decrement to 0 (remove), and stock limits**
- [ ] **Step 4: Verify visually and test interactions**

---

### Task 3: Implement Quantity Selector on Product Detail Page

**Files:**
- Create: `components/storefront/ProductDetailAddToCart.tsx`
- Modify: `app/[locale]/products/[slug]/page.tsx`

**Interfaces:**
- Consumes: `useCart()` and product pricing & stock info
- Produces: Interactive quantity selector with live subtotal calculation, "Add to Cart", and "Order Now" buttons

- [ ] **Step 1: Create `ProductDetailAddToCart` client component**
- [ ] **Step 2: Add quantity stepper `[-] [ qty ] [+]`, live subtotal display, and action buttons**
- [ ] **Step 3: Integrate into `app/[locale]/products/[slug]/page.tsx`**

---

### Task 4: Connect Header Badge and Cart Page to Real Cart State

**Files:**
- Modify: `components/storefront/Header.tsx`
- Modify: `components/storefront/CartView.tsx`

**Interfaces:**
- Consumes: `useCart()` state (`items`, `itemCount`, `subtotal`, `updateQty`, `removeFromCart`)

- [ ] **Step 1: Update `Header.tsx` to read `itemCount` live from `useCart()`**
- [ ] **Step 2: Update `CartView.tsx` to display real items from `useCart()` instead of static mock**
- [ ] **Step 3: Verify end-to-end cart sync: home -> product page -> cart page -> checkout**

---

### Task 5: Visual and Functional Verification

- [ ] **Step 1: Test multi-quantity addition on product card**
- [ ] **Step 2: Test multi-quantity addition on product detail page**
- [ ] **Step 3: Test removing items and header badge counts**
