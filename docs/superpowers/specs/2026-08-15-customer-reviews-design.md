# Customer Reviews & Rating Hub Design Specification

## Overview
Introduce a customer reviews and rating system on the VetMart Product Detail View (`/products/[slug]`). The system allows farm owners, veterinarians, and pet parents to read authentic feedback, see rating distribution breakdowns, filter reviews by star rating or reviewer role, and submit new reviews with instant client persistence and optimistic UI updates.

---

## 1. User Experience & Components

### A. Star Rating Summary & Header Preview
- Under the Product Title on the Product Detail Page:
  - Star rating preview: `★ 4.9 (34 reviews / রিভিউ)` with smooth scroll jump to the reviews section.
- Reviews Section Header:
  - Overall rating card with large numeric score (e.g. `4.8` out of `5.0`).
  - Total count of verified purchaser reviews.
  - Interactive Star Distribution Bars (5-star down to 1-star percentage meters with click-to-filter capability).
  - Filter pills: `All`, `5 Stars`, `4 Stars`, `Verified Buyers`, `Veterinarians (DVM)`, `Dairy & Poultry Farms`.

### B. Interactive "Write a Review" Form (`ProductReviewForm.tsx`)
- Toggleable inline accordion / modal to submit a new review:
  - **Star Rating Selector**: 1–5 clickable/hoverable gold stars with text feedback ("Poor", "Fair", "Good", "Very Good", "Excellent" / "চমৎকার").
  - **Reviewer Info**: Name, Role (`Dairy Farmer`, `Poultry Farmer`, `Registered Vet (DVM)`, `Pet Parent`), and Location (e.g., Bogura, Gazipur, Dhaka).
  - **Species Treated**: Dropdown/selector (Cattle, Poultry, Goat/Sheep, Aqua, Pet).
  - **Review Title & Body**: Text area for detailed medication results / feedback.
  - **Recommendation Toggle**: "Would you recommend this medication to other farmers/vets?"
  - **Submit Button**: Instant validation, optimistic update into the review list, and persistence to `localStorage` (key `vetmart_reviews_<productId>`).

### C. Review Cards List (`ProductReviewsList.tsx`)
- Review card contains:
  - User avatar with initials and badge (`Verified Buyer / ভেরিফায়েড ক্রেতা`, `Registered DVM / রেজিস্টার্ড ভেট`).
  - Star rating (★★★★★) and formatted date (`fmtDate`).
  - Species treated pill (`🐄 Cattle / গবাদিপশু`, `🐔 Poultry / পোল্ট্রি`).
  - Review Title & detailed feedback.
  - "Helpful" thumbs-up counter button (`👍 সহায়ক (8)`).

### D. Default High-Quality Seed Reviews
- Seed realistic veterinary formulary reviews in `lib/mock-data/reviews.ts` for key medicines (Renaflox, Rena-WS, Catophos, Paracip, etc.) in both Bengali and English.

---

## 2. Technical Architecture & File Changes

1. **`lib/mock-data/reviews.ts`** [NEW]:
   - Default mock reviews with authentic farmer/vet feedback and helper functions `getReviewsForProduct(productId, slug)`.
2. **`components/storefront/ProductReviewsSection.tsx`** [NEW]:
   - Comprehensive client component housing Rating Summary, Distribution Bars, Filter Controls, Review List, and the "Write a Review" submission form.
3. **`components/storefront/ProductReviewForm.tsx`** [NEW]:
   - Interactive star rating and review submission form with `localStorage` persistence.
4. **`app/[locale]/products/[slug]/page.tsx`** [MODIFY]:
   - Integrate Star rating preview under product title and render `ProductReviewsSection` below the main product specifications card.

---

## 3. Bilingual Support (i18n)
- Bengali / English numbers formatted with `fmtNumber` and `fmtDate`.
- Localized headings: `ক্রেতাদের মতামত ও রিভিউ`, `রিভিউ লিখুন`, `ভেরিফায়েড ক্রেতা`, `সহায়ক`, `সুপারিশকৃত`.

---

## 4. Verification Plan
1. **Visual & Layout Check**:
   - Verify star preview under title and full review section below specs.
   - Verify 5-star distribution progress bars and filter buttons.
2. **Review Submission Flow**:
   - Click "Write a Review", select 5 stars, enter name and comments, click submit.
   - Verify newly submitted review appears immediately at the top of the list with "Verified" status.
   - Reload page -> verify review persists via `localStorage`.
3. **Filtering & Helpful Counter**:
   - Filter by 5 stars, click "Helpful" thumbs-up -> verify counter increments.
