// app/api/v1/products/[slug]/route.ts
// GET /api/v1/products/:slug — Single product detail (§9)
import { NextRequest } from 'next/server';
import { getProductBySlug } from '@/lib/services/products';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Props) {
  try {
    const { slug } = await params;
    const product = await getProductBySlug(slug);

    if (!product) {
      return apiError('PRODUCT_NOT_FOUND', `Product with slug "${slug}" not found`, 404);
    }

    return apiSuccess(product);
  } catch (err: any) {
    return apiError('PRODUCT_FETCH_FAILED', err?.message || 'Failed to fetch product', 500);
  }
}
