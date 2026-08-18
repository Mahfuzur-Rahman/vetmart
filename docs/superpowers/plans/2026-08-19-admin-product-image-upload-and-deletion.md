# Admin Product Image Upload (Cloudinary/Mobile/PC) & Cascade Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable administrators to upload product images from PC local folders or mobile camera/gallery directly into Cloudinary/storage, and safely delete products with full cascading removal of all product data and associated image files.

**Architecture:** 
- Frontend provides responsive drag-and-drop & native file picker with immediate preview.
- Backend endpoint `POST /api/v1/admin/upload` streams buffers to Cloudinary via `lib/storage/cloudinary.ts` (with local disk fallback).
- Backend endpoint `DELETE /api/v1/admin/products/[id]` cascades deletion across storage drivers and DB, while `AdminProductsTable.tsx` handles safety confirmation modals, state purging, and demo/localStorage persistence (`vetmart_deleted_product_ids`).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Cloudinary v2 SDK, Drizzle ORM, TailwindCSS.

---

### Task 1: Cloudinary Storage Driver Implementation

**Files:**
- Modify: `lib/storage/cloudinary.ts`
- Modify: `lib/storage/index.ts`

**Interfaces:**
- Consumes: `env.CLOUDINARY_CLOUD_NAME`, `env.CLOUDINARY_API_KEY`, `env.CLOUDINARY_API_SECRET` from `lib/env.ts`
- Produces: `cloudinaryDriver.put(key, buf, opts)`, `cloudinaryDriver.delete(key)`, `cloudinaryDriver.url(key, variant)`

- [ ] **Step 1: Write Cloudinary SDK v2 uploader and destroyer**
  Implement real stream-based buffer upload and asset destruction in `lib/storage/cloudinary.ts` using the official `cloudinary` package.

- [ ] **Step 2: Update storage driver selector in `lib/storage/index.ts`**
  Ensure driver switches cleanly to Cloudinary whenever Cloudinary env credentials are present or `STORAGE_DRIVER=cloudinary`.

- [ ] **Step 3: Verify driver functionality with Vitest or script check**

---

### Task 2: Admin Media Upload API Route

**Files:**
- Create: `app/api/v1/admin/upload/route.ts`

**Interfaces:**
- Consumes: `getStorageDriver()` from `lib/storage`
- Produces: `POST /api/v1/admin/upload` -> returns `{ success: true, data: { key, url, size, format } }`

- [ ] **Step 1: Implement `POST` handler in `app/api/v1/admin/upload/route.ts`**
  Parse multipart form data, validate image mime type (`image/jpeg`, `image/png`, `image/webp`, `image/avif`) and max file size (5MB).
  Stream buffer to `getStorageDriver().put(key, buffer, { contentType })` and return the CDN URL.

- [ ] **Step 2: Test upload route with a sample image payload**

---

### Task 3: Admin Product Cascade Deletion API Route

**Files:**
- Create: `app/api/v1/admin/products/[id]/route.ts`

**Interfaces:**
- Consumes: `getStorageDriver()` from `lib/storage`, `db` from `lib/db`
- Produces: `DELETE /api/v1/admin/products/[id]` -> returns `{ success: true, message, deletedId }`

- [ ] **Step 1: Implement `DELETE` handler in `app/api/v1/admin/products/[id]/route.ts`**
  Query product images / key, invoke `getStorageDriver().delete(imageKey)` to destroy Cloudinary/local storage asset, and execute `db.delete(products).where(eq(products.id, id))` with cascading cleanup.

- [ ] **Step 2: Verify deletion handler response**

---

### Task 4: Admin Products Table UI — File Uploader & Cascade Delete Modal

**Files:**
- Modify: `components/admin/AdminProductsTable.tsx`

**Interfaces:**
- Consumes: `/api/v1/admin/upload`, `/api/v1/admin/products/[id]`
- Produces: Rich drag-and-drop / mobile camera image uploader + Delete action button with safety confirmation dialog and toast notifications.

- [ ] **Step 1: Add Image Upload Dropzone to Enroll Modal**
  Add file input supporting PC file browsing, drag & drop, and mobile camera / photo gallery with live thumbnail preview and loading state.

- [ ] **Step 2: Add Delete Product Action & Confirmation Modal**
  Add Delete button to each table row. Clicking opens a danger-styled confirmation modal showing product details. Confirming triggers the API deletion, cleans up `localStorage` (`vetmart_custom_products`), persists the deleted ID in `vetmart_deleted_product_ids`, and updates UI state.

- [ ] **Step 3: Filter deleted products across catalog**
  Ensure `vetmart_deleted_product_ids` hides deleted items on initial mount and reloads.

---

### Task 5: End-to-End Verification & Storefront Consistency

**Files:**
- Test across: Admin portal (`/admin/products`), Storefront (`/products`, `/products/[slug]`, `/order/[slug]`).

- [ ] **Step 1: Test file upload on desktop and mobile viewports**
- [ ] **Step 2: Test product deletion and verify asset destruction and removal from table and storefront**
- [ ] **Step 3: Verify bilingual text (Bangla and English) and contrast compliance**
