// lib/services/reviews.ts
// Product Reviews service — CRUD operations & database queries
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productReviews, products } from '@/lib/db/schema';

export interface Review {
  id: string;
  productId?: string;
  productSlug?: string;
  authorName: string;
  authorRole: 'dairy_farmer' | 'poultry_farmer' | 'vet_dvm' | 'pet_owner' | 'farmer';
  authorRoleLabelEn: string;
  authorRoleLabelBn: string;
  location: string;
  rating: number; // 1 to 5
  titleEn: string;
  titleBn: string;
  commentEn: string;
  commentBn: string;
  speciesTreated?: string;
  speciesTreatedLabelEn?: string;
  speciesTreatedLabelBn?: string;
  isVerifiedPurchase: boolean;
  isVetRecommended?: boolean;
  helpfulCount: number;
  createdAt: string;
}

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
 * Fetch approved reviews for a product by slug
 */
export async function getReviewsByProductSlug(slug: string): Promise<Review[]> {
  try {
    const [p] = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (!p) {
      return [];
    }

    const dbReviews = await db
      .select()
      .from(productReviews)
      .where(and(eq(productReviews.productId, p.id), eq(productReviews.isApproved, true)))
      .orderBy(desc(productReviews.createdAt));

    if (!dbReviews || dbReviews.length === 0) {
      return [];
    }

    return dbReviews.map((r) => {
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
  } catch (error) {
    console.error('Error fetching reviews from DB:', error);
    return [];
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

  if (targetProductId) {
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
      console.error('Failed to insert review into DB:', err);
    }
  }

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
  try {
    await db
      .update(productReviews)
      .set({ helpfulCount: sql`${productReviews.helpfulCount} + 1` })
      .where(eq(productReviews.id, reviewId));
  } catch (err) {
    console.error('Failed to update review helpful count in DB:', err);
  }
}

/**
 * Calculate summary review statistics for a list of reviews
 */
export function calculateReviewStats(reviews: Review[]) {
  const total = reviews.length;
  if (total === 0) {
    return {
      avgRating: 5.0,
      totalReviews: 0,
      verifiedCount: 0,
      recommendedPct: 100,
      ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
      ratingPercentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>,
    };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const avgRating = Number((sum / total).toFixed(1));

  const ratingCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let verifiedCount = 0;
  let recommendedCount = 0;

  reviews.forEach((r) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    ratingCounts[star] = (ratingCounts[star] || 0) + 1;
    if (r.isVerifiedPurchase) verifiedCount++;
    if (r.rating >= 4 || r.isVetRecommended) recommendedCount++;
  });

  const ratingPercentages: Record<number, number> = {
    5: Math.round(((ratingCounts[5] || 0) / total) * 100),
    4: Math.round(((ratingCounts[4] || 0) / total) * 100),
    3: Math.round(((ratingCounts[3] || 0) / total) * 100),
    2: Math.round(((ratingCounts[2] || 0) / total) * 100),
    1: Math.round(((ratingCounts[1] || 0) / total) * 100),
  };

  const recommendedPct = Math.round((recommendedCount / total) * 100);

  return {
    avgRating,
    totalReviews: total,
    verifiedCount,
    recommendedPct,
    ratingCounts,
    ratingPercentages,
  };
}
