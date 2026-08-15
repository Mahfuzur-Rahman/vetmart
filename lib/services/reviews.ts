// lib/services/reviews.ts
// Product Reviews service — CRUD operations, database queries, and fallback support
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productReviews, products } from '@/lib/db/schema';
import { isDemoMode } from '@/lib/demo';
import { getProductReviews as getMockReviews, type Review } from '@/lib/mock-data/reviews';

export interface CreateReviewInput {
  productId?: string;
  productSlug?: string;
  userId?: string;
  authorName: string;
  authorRole: 'dairy_farmer' | 'poultry_farmer' | 'vet_dvm' | 'pet_owner' | 'farmer';
  location?: string;
  rating: number;
  title?: string;
  comment: string;
  speciesTreated?: string;
  isVetRecommended?: boolean;
}

const ROLE_LABELS: Record<string, { en: string; bn: string }> = {
  vet_dvm: { en: 'Registered Veterinarian (DVM)', bn: 'রেজিস্টার্ড ভেটেরিনারিয়ান (ডিভিএম)' },
  dairy_farmer: { en: 'Dairy & Cattle Farmer', bn: 'ডেইরি ও দুগ্ধ খামারি' },
  poultry_farmer: { en: 'Commercial Poultry Farmer', bn: 'বাণিজ্যিক পোল্ট্রি খামারি' },
  pet_owner: { en: 'Pet Parent (Cat / Dog)', bn: 'পোষা প্রাণীর অভিভাবক (বিড়াল/কুকুর)' },
  farmer: { en: 'General Livestock Farmer', bn: 'সাধারণ গবাদিপশু খামারি' },
};

const SPECIES_LABELS: Record<string, { en: string; bn: string }> = {
  cattle: { en: 'Dairy Cattle & Buffalo', bn: 'গাভী ও মহিষ' },
  poultry: { en: 'Broiler & Layer Poultry', bn: 'ব্রয়লার ও লেয়ার মুরগি' },
  goat: { en: 'Goat & Sheep', bn: 'ছাগল ও ভেড়া' },
  aqua: { en: 'Fish & Aqua Culture', bn: 'মাছ ও চিংড়ি' },
  pet: { en: 'Pets (Dogs, Cats, Birds)', bn: 'পোষা প্রাণী (কুকুর, বিড়াল)' },
};

/**
 * Fetch approved reviews for a product by slug or ID
 */
export async function getReviewsByProductSlug(slug: string): Promise<Review[]> {
  const seedReviews = getMockReviews(slug);

  if (isDemoMode()) {
    return seedReviews;
  }

  try {
    // 1. Find product ID
    const [p] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!p) {
      return seedReviews;
    }

    // 2. Fetch reviews from DB
    const dbReviews = await db
      .select()
      .from(productReviews)
      .where(and(eq(productReviews.productId, p.id), eq(productReviews.isApproved, true)))
      .orderBy(desc(productReviews.createdAt));

    if (!dbReviews || dbReviews.length === 0) {
      return seedReviews;
    }

    const mappedDbReviews: Review[] = dbReviews.map((r) => {
      const role = (r.authorRole as Review['authorRole']) || 'farmer';
      const roleLabel = ROLE_LABELS[role] || { en: 'Customer', bn: 'ক্রেতা' };
      const species = r.speciesTreated || undefined;
      const speciesLabel = species ? SPECIES_LABELS[species] : undefined;

      return {
        id: r.id,
        productId: r.productId,
        productSlug: slug,
        authorName: r.authorName,
        authorRole: role,
        authorRoleLabelEn: roleLabel.en,
        authorRoleLabelBn: roleLabel.bn,
        location: r.location || '',
        rating: r.rating,
        titleEn: r.title || '',
        titleBn: r.title || '',
        commentEn: r.comment,
        commentBn: r.comment,
        speciesTreated: species,
        speciesTreatedLabelEn: speciesLabel?.en,
        speciesTreatedLabelBn: speciesLabel?.bn,
        isVerifiedPurchase: r.isVerifiedPurchase,
        isVetRecommended: r.isVetRecommended,
        helpfulCount: r.helpfulCount,
        createdAt: r.createdAt.toISOString(),
      };
    });

    // Merge DB reviews with seed reviews
    const dbIds = new Set(mappedDbReviews.map((r) => r.id));
    const uniqueSeed = seedReviews.filter((r) => !dbIds.has(r.id));
    return [...mappedDbReviews, ...uniqueSeed];
  } catch (error) {
    console.error('Error fetching reviews from DB, returning seed reviews:', error);
    return seedReviews;
  }
}

/**
 * Insert a new customer review into the database
 */
export async function createProductReview(data: CreateReviewInput): Promise<Review> {
  let targetProductId = data.productId;

  if (!targetProductId && data.productSlug) {
    const [p] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, data.productSlug))
      .limit(1);

    if (p) targetProductId = p.id;
  }

  const role = data.authorRole || 'farmer';
  const roleLabel = ROLE_LABELS[role] || { en: 'Customer', bn: 'ক্রেতা' };
  const species = data.speciesTreated || undefined;
  const speciesLabel = species ? SPECIES_LABELS[species] : undefined;

  if (!isDemoMode() && targetProductId) {
    try {
      const [inserted] = await db
        .insert(productReviews)
        .values({
          productId: targetProductId,
          userId: data.userId || null,
          authorName: data.authorName,
          authorRole: role,
          location: data.location || null,
          rating: Math.min(5, Math.max(1, Math.round(data.rating))),
          title: data.title || null,
          comment: data.comment,
          speciesTreated: species || null,
          isVerifiedPurchase: true,
          isVetRecommended: data.isVetRecommended ?? false,
          helpfulCount: 0,
          isApproved: true,
        })
        .returning();

      if (inserted) {
        return {
          id: inserted.id,
          productId: inserted.productId,
          productSlug: data.productSlug,
          authorName: inserted.authorName,
          authorRole: role,
          authorRoleLabelEn: roleLabel.en,
          authorRoleLabelBn: roleLabel.bn,
          location: inserted.location || '',
          rating: inserted.rating,
          titleEn: inserted.title || '',
          titleBn: inserted.title || '',
          commentEn: inserted.comment,
          commentBn: inserted.comment,
          speciesTreated: species,
          speciesTreatedLabelEn: speciesLabel?.en,
          speciesTreatedLabelBn: speciesLabel?.bn,
          isVerifiedPurchase: inserted.isVerifiedPurchase,
          isVetRecommended: inserted.isVetRecommended,
          helpfulCount: inserted.helpfulCount,
          createdAt: inserted.createdAt.toISOString(),
        };
      }
    } catch (err) {
      console.error('Failed to insert review into DB, falling back:', err);
    }
  }

  // Fallback returned review
  return {
    id: `rev-${Date.now()}`,
    productId: targetProductId,
    productSlug: data.productSlug,
    authorName: data.authorName,
    authorRole: role,
    authorRoleLabelEn: roleLabel.en,
    authorRoleLabelBn: roleLabel.bn,
    location: data.location || '',
    rating: data.rating,
    titleEn: data.title || '',
    titleBn: data.title || '',
    commentEn: data.comment,
    commentBn: data.comment,
    speciesTreated: species,
    speciesTreatedLabelEn: speciesLabel?.en,
    speciesTreatedLabelBn: speciesLabel?.bn,
    isVerifiedPurchase: true,
    isVetRecommended: data.isVetRecommended,
    helpfulCount: 0,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Increment helpful count for a review
 */
export async function incrementReviewHelpful(reviewId: string) {
  if (!isDemoMode()) {
    try {
      await db
        .update(productReviews)
        .set({ helpfulCount: sql`${productReviews.helpfulCount} + 1` })
        .where(eq(productReviews.id, reviewId));
    } catch (err) {
      console.error('Failed to update review helpful count in DB:', err);
    }
  }
}
