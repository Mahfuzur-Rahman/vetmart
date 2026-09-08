// app/api/v1/checkout/route.ts
// POST /api/v1/checkout — Place an order (§9)
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { checkDbConnection } from '@/lib/db';
import { resolveUser } from '@/lib/auth/resolve';
import { findOrCreateCart } from '@/lib/services/cart';
import { placeOrder } from '@/lib/services/checkout';
import { validateCoupon } from '@/lib/services/coupons';
import { apiSuccess, apiError } from '@/lib/api/response';

const checkoutSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(['cod', 'sslcommerz', 'bkash_direct']).default('cod'),
  couponCode: z.string().optional(),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    if (!(await checkDbConnection())) {
      return apiError('SERVICE_UNAVAILABLE', 'Service is currently unavailable', 503);
    }

    // §9: mandatory on POST /orders. The guest express route already required
    // it; this one did not, so any retry on a dropped mobile connection created
    // a second order and later a second courier consignment.
    const idempotencyKey = req.headers.get('idempotency-key')?.trim();
    if (!idempotencyKey) {
      return apiError(
        'IDEMPOTENCY_KEY_REQUIRED',
        'An Idempotency-Key header is required when placing an order.',
        400
      );
    }

    const user = await resolveUser(req);
    if (!user) {
      return apiError('UNAUTHORIZED', 'Login required to place an order.', 401);
    }

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        'Valid addressId and paymentMethod are required.',
        422,
        undefined,
        parsed.error.flatten().fieldErrors
      );
    }

    const cartId = await findOrCreateCart(user.id);

    // Validate coupon if provided
    let couponResult;
    if (parsed.data.couponCode) {
      // We'll need subtotal for validation — do a pre-calc
      const { getCartView } = await import('@/lib/services/cart');
      const cart = await getCartView(cartId);
      const subtotal = cart.items.reduce((s, i) => s + i.qty * i.product.salePrice, 0);

      couponResult = await validateCoupon(
        parsed.data.couponCode,
        subtotal,
        user.id,
        user.tier
      );

      if (!couponResult.valid) {
        return apiError('COUPON_INVALID', couponResult.error || 'Invalid coupon.', 400);
      }
    }

    const result = await placeOrder({
      cartId,
      userId: user.id,
      addressId: parsed.data.addressId,
      paymentMethod: parsed.data.paymentMethod,
      couponResult,
      note: parsed.data.note,
      idempotencyKey,
    });

    if (!result.success) {
      return apiError(
        'CHECKOUT_FAILED',
        result.error || 'Order placement failed.',
        400,
        undefined,
        result.insufficientItems
      );
    }

    return apiSuccess(
      {
        orderId: result.orderId,
        orderNo: result.orderNo,
        total: result.total,
      },
      { replayed: !!result.replayed },
      result.replayed ? 200 : 201
    );
  } catch (err: any) {
    return apiError('CHECKOUT_ERROR', err?.message || 'Checkout failed', 500);
  }
}
