# Customer Reviews & Rating Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide an authentic, comprehensive customer reviews and rating system on the product detail page with star breakdowns, reviewer role tags (Dairy, Poultry, DVM, Pet Owner), filter controls, and an interactive review submission form.

**Architecture:** Client-side review management in `ProductReviewsSection` merging seed reviews from `lib/mock-data/reviews.ts` with user-submitted reviews in `localStorage`. Interactive `ProductReviewForm` handles star rating selection and form validation. Product page includes rating summary pills and scroll anchors.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons / SVG.

---

### Task 1: Create Review Data Structures & Seed Reviews

**Files:**
- Create: `lib/mock-data/reviews.ts`

**Interfaces:**
- Produces: `Review` interface, `MOCK_REVIEWS`, `getProductReviews(productId, slug)`

- [ ] **Step 1: Define Review interface and realistic veterinary medicine reviews in Bengali and English**
- [ ] **Step 2: Provide retrieval and stats helper functions**

---

### Task 2: Create Review Submission Form Component (`ProductReviewForm.tsx`)

**Files:**
- Create: `components/storefront/ProductReviewForm.tsx`

**Interfaces:**
- Produces: Interactive star picker, role selection, species selector, and validation callback `onSubmit(review)`

- [ ] **Step 1: Build interactive star picker (1-5 stars with hover states)**
- [ ] **Step 2: Build farmer/vet role selector and species treated dropdown**
- [ ] **Step 3: Handle submit with validation and callback**

---

### Task 3: Build Full Product Reviews Hub Section (`ProductReviewsSection.tsx`)

**Files:**
- Create: `components/storefront/ProductReviewsSection.tsx`

**Interfaces:**
- Produces: Rating summary card, star distribution progress bars, filter pills, review cards list, helpful button counter

- [ ] **Step 1: Render rating summary & distribution percentage bars**
- [ ] **Step 2: Render filter pills (All, 5★, 4★, Verified, Vet reviews)**
- [ ] **Step 3: Render review list with verified badges and helpful upvotes**
- [ ] **Step 4: Integrate `ProductReviewForm` with `localStorage` persistence**

---

### Task 4: Integrate into Product Detail Page (`app/[locale]/products/[slug]/page.tsx`)

**Files:**
- Modify: `app/[locale]/products/[slug]/page.tsx`

**Interfaces:**
- Consumes: `ProductReviewsSection`, rating summary pill under product title

- [ ] **Step 1: Add star rating preview badge under product title with anchor link**
- [ ] **Step 2: Embed `ProductReviewsSection` below specifications card**
- [ ] **Step 3: Verify build and test review submission and filtering**
