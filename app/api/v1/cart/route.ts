// app/api/v1/cart/route.ts
// GET /api/v1/cart — Get cart contents
// POST /api/v1/cart — Add item to cart
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve';
import { findOrCreateCart, getCartView, addToCart } from '@/lib/services/cart';
import { apiSuccess, apiError } from '@/lib/api/response';

const addItemSchema = z.object({
  productId: z.string().uuid(),
  qty: z.number().int().min(1).default(1),
});

export async function GET(req: NextRequest) {
  try {
    const user = await resolveUser(req);
    const sessionId = req.cookies.get('vetmart_guest_session')?.value;

    if (!user && !sessionId) {
      return apiSuccess({ cartId: null, items: [], itemCount: 0 });
    }

    const cartId = await findOrCreateCart(user?.id, sessionId ?? undefined);
    const cart = await getCartView(cartId);

    return apiSuccess(cart);
  } catch (err: any) {
    return apiError('CART_FETCH_FAILED', err?.message || 'Failed to fetch cart', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = addItemSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Valid productId and qty are required.', 422);
    }

    const user = await resolveUser(req);
    const sessionId = req.cookies.get('vetmart_guest_session')?.value;

    if (!user && !sessionId) {
      return apiError('SESSION_REQUIRED', 'A guest session or login is required to use the cart.', 401);
    }

    const cartId = await findOrCreateCart(user?.id, sessionId ?? undefined);
    await addToCart(cartId, parsed.data.productId, parsed.data.qty);

    const cart = await getCartView(cartId);
    return apiSuccess(cart);
  } catch (err: any) {
    return apiError('CART_ADD_FAILED', err?.message || 'Failed to add item to cart', 500);
  }
}
