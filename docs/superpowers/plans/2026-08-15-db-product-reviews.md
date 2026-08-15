# Database Persistence for Product Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist customer product reviews in PostgreSQL via Drizzle ORM, generate migrations, provide backend CRUD service and API routes, and connect the frontend reviews component to the database.

**Architecture:** Add `productReviews` table in `lib/db/schema/catalog.ts`. Provide `lib/services/reviews.ts` for database queries and mutations with demo/fallback support. Expose `GET /api/v1/products/[slug]/reviews` and `POST /api/v1/products/[slug]/reviews`. Hook frontend `ProductReviewsSection` to these endpoints.

**Tech Stack:** Next.js 15, Drizzle ORM, PostgreSQL, Zod, TypeScript.

---

### Task 1: Add `productReviews` Table to Drizzle Schema

**Files:**
- Modify: `lib/db/schema/catalog.ts`
- Modify: `lib/db/schema/index.ts`

- [ ] **Step 1: Define `productReviews` schema with relations to `products` and `users`**
- [ ] **Step 2: Run `npm run db:generate` to generate migration SQL**

---

### Task 2: Create Reviews Database Service (`lib/services/reviews.ts`)

**Files:**
- Create: `lib/services/reviews.ts`

- [ ] **Step 1: Implement `getReviewsByProductSlug`, `createReview`, and `incrementHelpfulCount`**
- [ ] **Step 2: Add demo mode and mock fallback gracefully when DB is offline**

---

### Task 3: Create API Routes for Product Reviews

**Files:**
- Create: `app/api/v1/products/[slug]/reviews/route.ts`
- Create: `app/api/v1/reviews/[reviewId]/helpful/route.ts`

- [ ] **Step 1: Implement GET and POST in `/api/v1/products/[slug]/reviews` with Zod validation**
- [ ] **Step 2: Implement POST in `/api/v1/reviews/[reviewId]/helpful`**

---

### Task 4: Connect Frontend Reviews to the Backend API

**Files:**
- Modify: `components/storefront/ProductReviewsSection.tsx`
- Modify: `components/storefront/ProductReviewForm.tsx`

- [ ] **Step 1: Fetch reviews from `/api/v1/products/[slug]/reviews` on mount**
- [ ] **Step 2: Send POST request on review submission and update state**
- [ ] **Step 3: Call helpful API on upvote**

---

### Task 5: Build & End-to-End Verification

- [ ] **Step 1: Run `npm run build`**
- [ ] **Step 2: Test API and frontend integration in browser**
