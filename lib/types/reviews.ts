// lib/types/reviews.ts

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
