// app/api/v1/admin/products/route.ts
// POST /api/v1/admin/products — Create a catalog product (§5, §9, §10)
//
// Thin transport only. All catalog logic lives in lib/services/products.ts so
// the Flutter client can reach the same behaviour without a rewrite (§2 rule 1).
import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { createProduct, DemoModeWriteError } from '@/lib/services/products';
import { requireAdmin } from '@/lib/api/guard';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function POST(req: NextRequest) {
  const guard = await requireAdmin('product.write');
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body is not valid JSON', 400);
  }

  try {
    const created = await createProduct(body);
    return apiSuccess(created, undefined, 201);
  } catch (err) {
    // A validation failure is the operator's to fix — return the offending
    // field so the admin form can highlight it (§9).
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return apiError(
        'PRODUCT_VALIDATION_FAILED',
        first?.message ?? 'Product data is invalid',
        422,
        first?.path.join('.'),
        err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      );
    }

    if (err instanceof DemoModeWriteError) {
      return apiError(err.code, err.message, 409);
    }

    // Previously this branch logged a warning and returned 200 anyway, so the
    // admin UI reported "Product created successfully" for a write that never
    // reached Postgres. Never swallow a write failure.
    console.error('[POST /api/v1/admin/products] Create failed:', err);
    return apiError(
      'PRODUCT_CREATE_FAILED',
      err instanceof Error ? err.message : 'Failed to create product',
      500
    );
  }
}
