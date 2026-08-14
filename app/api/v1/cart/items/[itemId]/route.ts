// app/api/v1/cart/items/[itemId]/route.ts
// PATCH /api/v1/cart/items/:itemId — Update qty
// DELETE /api/v1/cart/items/:itemId — Remove item
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { resolveUser } from '@/lib/auth/resolve';
import { findOrCreateCart, updateCartItemQty, removeFromCart, getCartView } from '@/lib/services/cart';
import { apiSuccess, apiError } from '@/lib/api/response';

type Props = { params: Promise<{ itemId: string }> };

const updateSchema = z.object({
  qty: z.number().int().min(0),
});

export async function PATCH(req: NextRequest, { params }: Props) {
  try {
    const { itemId } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Valid qty (integer >= 0) is required.', 422);
    }

    const user = await resolveUser(req);
    const sessionId = req.cookies.get('vetmart_guest_session')?.value;
    const cartId = await findOrCreateCart(user?.id, sessionId ?? undefined);

    await updateCartItemQty(cartId, itemId, parsed.data.qty);
    const cart = await getCartView(cartId);

    return apiSuccess(cart);
  } catch (err: any) {
    return apiError('CART_UPDATE_FAILED', err?.message || 'Failed to update cart item', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Props) {
  try {
    const { itemId } = await params;

    const user = await resolveUser(req);
    const sessionId = req.cookies.get('vetmart_guest_session')?.value;
    const cartId = await findOrCreateCart(user?.id, sessionId ?? undefined);

    await removeFromCart(cartId, itemId);
    const cart = await getCartView(cartId);

    return apiSuccess(cart);
  } catch (err: any) {
    return apiError('CART_REMOVE_FAILED', err?.message || 'Failed to remove cart item', 500);
  }
}
