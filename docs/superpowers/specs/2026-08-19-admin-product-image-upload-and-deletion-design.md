# Admin Product Image Upload (Cloudinary/PC/Mobile) & Cascade Deletion Design

## 1. Overview & Business Intent

Administrators managing veterinary pharmaceuticals in VetMart BD need a modern, intuitive way to:
1. **Upload product images** directly from their local computer storage (PC) or smartphone (mobile camera / photo gallery).
2. **Store & serve images** efficiently using the configured **Cloudinary** integration (with local disk fallback).
3. **Delete products safely & completely**, ensuring that deleting a product permanently removes all associated database records, custom storage entries, and stored image assets from Cloudinary or local disk.

---

## 2. User Experience & Workflow

### 2.1 Image Upload (PC & Mobile)
- **Native File Picker**: `<input type="file" accept="image/*">` supporting PC file explorer and mobile camera/gallery triggers (`capture` or photo library).
- **Drag-and-Drop Area**: Dropzone for desktop users with intuitive hover/drag states.
- **Instant Preview**: Live client-side thumbnail rendering before/during upload.
- **Cloudinary Integration**: Uploads file via `/api/v1/admin/upload`, which streams the image buffer to Cloudinary using the official SDK, generating optimized CDN URLs.
- **Image Actions**: Ability to replace the image or remove it with one click.

### 2.2 Product & Image Deletion
- **Action Trigger**: A distinct "Delete" (🗑️) button on each product row in the Admin Products Table.
- **Safety Confirmation Modal**: A two-step modal showing product title, SKU, and a clear warning that all image files and data will be permanently destroyed.
- **Cascading Cleanup**:
  1. Deletes the physical/cloud image from Cloudinary (via `cloudinary.uploader.destroy`) or local disk (`/public/media/`).
  2. Deletes the product entry from PostgreSQL database (cascades to batches, reviews, images).
  3. Purges from `localStorage` (`vetmart_custom_products`) and marks the ID in `vetmart_deleted_product_ids` for demo persistence.
  4. Removes the product from React table state and displays a bilingual success toast.

---

## 3. Technical Architecture

### 3.1 Cloudinary Storage Driver (`lib/storage/cloudinary.ts`)
- Initialize Cloudinary v2 SDK using `env.CLOUDINARY_CLOUD_NAME`, `env.CLOUDINARY_API_KEY`, `env.CLOUDINARY_API_SECRET`.
- Implement `put()` to stream buffers to `vetmart/products/{key}` with auto-format and optimization.
- Implement `delete()` to call `cloudinary.uploader.destroy(publicId)`.
- Implement `url()` to generate responsive CDN URLs with Cloudinary transformation parameters.

### 3.2 Media Upload Endpoint (`app/api/v1/admin/upload/route.ts`)
- Accepts `multipart/form-data` with `file`.
- Validates mime type (`image/jpeg`, `image/png`, `image/webp`, `image/avif`) and max file size (5MB).
- Calls active `StorageDriver.put()`.
- Returns `{ url, key, size, format }`.

### 3.3 Product Deletion Endpoint (`app/api/v1/admin/products/[id]/route.ts`)
- Handles `DELETE` requests:
  1. Retrieves product and image metadata from DB / storage.
  2. Calls `StorageDriver.delete()` for all associated image keys.
  3. Deletes product record from database (`drizzle-orm`).
  4. Returns `{ success: true, deletedId }`.

### 3.4 Admin UI Enhancement (`components/admin/AdminProductsTable.tsx`)
- **Add Product Modal**: Replace raw URL text input with tactile Image Upload Dropzone (File selector, Camera trigger, Live preview, Cloudinary upload status, Clear button).
- **Table Column**: Add dedicated "Actions" column with Delete button (and Edit capability).
- **Delete Confirmation Modal**: Fully styled, accessible modal with bilingual confirmation prompts.
- **Deleted IDs Tracker**: Integrates with `vetmart_deleted_product_ids` so default mock data items can also be deleted and persisted.

---

## 4. Verification & Testing

1. **PC Upload Test**: Select local image file via file browser and drag-and-drop; verify Cloudinary upload and preview.
2. **Mobile Capture Test**: Verify file selector opens mobile camera / photo picker on mobile viewport.
3. **Delete Cascade Test**:
   - Create a product with an uploaded image.
   - Click delete and confirm in modal.
   - Verify product vanishes from table and storefront.
   - Verify Cloudinary asset destroy / local storage unlink executes without errors.
4. **Bilingual Verification**: Confirm all modals, buttons, and toast notifications render seamlessly in both English and Bengali.
