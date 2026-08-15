// app/api/v1/reviews/[reviewId]/helpful/route.ts
import { NextRequest } from 'next/server';
import { incrementReviewHelpful } from '@/lib/services/reviews';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = {
  params: Promise<{ reviewId: string }>;
};

export async function POST(req: NextRequest, { params }: Props) {
  try {
    const { reviewId } = await params;
    await incrementReviewHelpful(reviewId);
    return apiSuccess({ success: true, reviewId });
  } catch (err: any) {
    return apiError('HELPFUL_UPDATE_FAILED', err?.message || 'Failed to update helpful count', 500);
  }
}
