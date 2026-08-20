// app/api/v1/admin/products/[id]/route.ts
// PUT / DELETE /api/v1/admin/products/:id — Product update & cascade deletion (§5, §9, §10)
//
// Thin transport only; catalog logic lives in lib/services/products.ts (§2 rule 1).
import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import {
  updateProduct,
  deleteProduct,
  ProductNotFoundError,
  DemoModeWriteError,
} from '@/lib/services/products';
import { apiSuccess, apiError } from '@/lib/api/response';
import { requireAdmin } from '@/lib/api/guard';

type Props = { params: Promise<{ id: string }> };

/** Maps a thrown service error onto the API envelope (§9). */
function toErrorResponse(err: unknown, fallbackCode: string, fallbackMessage: string) {
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

  // A missing row used to return 200 with "Product updated successfully".
  if (err instanceof ProductNotFoundError) {
    return apiError(err.code, err.message, 404);
  }

  if (err instanceof DemoModeWriteError) {
    return apiError(err.code, err.message, 409);
  }

  console.error(`[${fallbackCode}]`, err);
  return apiError(fallbackCode, err instanceof Error ? err.message : fallbackMessage, 500);
}

export async function PUT(req: NextRequest, { params }: Props) {
  const guard = await requireAdmin('product.write');
  if (!guard.ok) return guard.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body is not valid JSON', 400);
  }

  try {
    const updated = await updateProduct(id, body);
    return apiSuccess(updated);
  } catch (err) {
    return toErrorResponse(err, 'PRODUCT_UPDATE_FAILED', 'Failed to update product');
  }
}

export async function DELETE(_req: NextRequest, { params }: Props) {
  const guard = await requireAdmin('product.write');
  if (!guard.ok) return guard.response;

  const { id } = await params;

  try {
    const deleted = await deleteProduct(id);
    return apiSuccess(deleted);
  } catch (err) {
    return toErrorResponse(err, 'PRODUCT_DELETE_FAILED', 'Failed to delete product');
  }
}
