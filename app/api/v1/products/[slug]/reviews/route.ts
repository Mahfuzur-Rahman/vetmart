// app/api/v1/products/[slug]/reviews/route.ts
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve';
import { getReviewsByProductSlug, createProductReview } from '@/lib/services/reviews';
import { apiSuccess, apiError } from '@/lib/api/response';

const createReviewSchema = z.object({
  productId: z.string().optional(),
  authorName: z.string().min(2, 'Name must be at least 2 characters'),
  authorRole: z.enum(['dairy_farmer', 'poultry_farmer', 'vet_dvm', 'pet_owner', 'farmer']).default('dairy_farmer'),
  location: z.string().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().min(5, 'Review comment must be at least 5 characters'),
  speciesTreated: z.string().optional(),
  isVetRecommended: z.boolean().optional(),
});

type Props = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: NextRequest, { params }: Props) {
  try {
    const { slug } = await params;
    const reviews = await getReviewsByProductSlug(slug);
    return apiSuccess(reviews, { count: reviews.length });
  } catch (err: any) {
    return apiError('REVIEWS_FETCH_FAILED', err?.message || 'Failed to fetch reviews', 500);
  }
}

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const parsed = createReviewSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Invalid review data provided', 422, undefined, parsed.error.format());
    }

    const user = await resolveUser(req);

    const review = await createProductReview({
      ...parsed.data,
      productSlug: slug,
      userId: user?.id,
    });

    return apiSuccess(review, undefined, 201);
  } catch (err: any) {
    return apiError('REVIEW_CREATE_FAILED', err?.message || 'Failed to submit review', 500);
  }
}
