// lib/services/coupons.ts
// Coupon validation and application (§6, §14.2)
import { eq, and, gt, lt, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { coupons } from '@/lib/db/schema';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: typeof coupons.$inferSelect;
  discountPaisa?: number;
  error?: string;
}

/**
 * Validate and calculate a coupon discount against a cart subtotal.
 */
export async function validateCoupon(
  code: string,
  subtotalPaisa: number,
  userId?: string,
  customerTier?: string
): Promise<CouponValidationResult> {
  const now = new Date();

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code.trim().toUpperCase()))
    .limit(1);

  if (!coupon) {
    return { valid: false, error: 'Coupon code not found.' };
  }

  // Date validity
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    return { valid: false, error: 'This coupon is not active yet.' };
  }
  if (coupon.endsAt && new Date(coupon.endsAt) < now) {
    return { valid: false, error: 'This coupon has expired.' };
  }

  // Usage limit check
  if (coupon.totalLimit && coupon.usedCount >= coupon.totalLimit) {
    return { valid: false, error: 'This coupon has reached its usage limit.' };
  }

  // Minimum basket check
  if (subtotalPaisa < coupon.minBasket) {
    return {
      valid: false,
      error: `Minimum order amount of ৳${(coupon.minBasket / 100).toFixed(0)} required.`,
    };
  }

  // Tier scope check
  if (coupon.tierScope && coupon.tierScope.length > 0 && customerTier) {
    if (!coupon.tierScope.includes(customerTier)) {
      return { valid: false, error: 'This coupon is not available for your account tier.' };
    }
  }

  // Calculate discount
  let discountPaisa = 0;
  switch (coupon.type) {
    case 'percentage':
      discountPaisa = Math.round((subtotalPaisa * coupon.value) / 10000); // value is percent * 100
      break;
    case 'fixed':
      discountPaisa = coupon.value; // Already in paisa
      break;
    case 'free_shipping':
      discountPaisa = 0; // Handled at checkout — shipping set to 0
      break;
    default:
      return { valid: false, error: 'Unknown coupon type.' };
  }

  // Cap discount at subtotal
  discountPaisa = Math.min(discountPaisa, subtotalPaisa);

  return {
    valid: true,
    coupon,
    discountPaisa,
  };
}

/**
 * Increment coupon usage count after successful order placement.
 */
export async function incrementCouponUsage(couponId: string) {
  await db
    .update(coupons)
    .set({ usedCount: coupons.usedCount })
    .where(eq(coupons.id, couponId));

  // Using raw SQL increment to avoid race conditions
  const { sql: pgSql } = await import('@/lib/db');
  await pgSql`UPDATE coupons SET used_count = used_count + 1 WHERE id = ${couponId}`;
}
