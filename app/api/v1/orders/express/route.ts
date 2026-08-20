// app/api/v1/orders/express/route.ts
// POST /api/v1/orders/express — Place a guest COD order (§9, §13)
//
// Thin transport over lib/services/checkout.ts (§2 rule 1). This is the flow the
// social / express landing pages use: no account, no DB cart, no saved address.
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { placeGuestOrder } from '@/lib/services/checkout';
import { normalizeDigits } from '@/lib/i18n/number';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/** Accepts 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX, in any digit script (§20). */
const bdPhone = z
  .string()
  .transform((v) => normalizeDigits(v).replace(/[\s-]/g, ''))
  .refine((v) => /^(?:\+?880|0)1[3-9]\d{8}$/.test(v), {
    message: 'Enter a valid Bangladeshi mobile number, for example 01712345678.',
  });

const expressOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid().optional(),
        slug: z.string().trim().min(1).optional(),
        qty: z.preprocess(
          (v) => (typeof v === 'string' ? Number(normalizeDigits(v)) : v),
          z.number().int().positive().max(999)
        ),
      })
      .refine((i) => !!(i.productId || i.slug), {
        message: 'Each item needs a productId or a slug.',
      })
    )
    .min(1, 'Order must contain at least one item.'),

  recipientName: z.string().trim().min(1, 'Recipient name is required.'),
  phone: bdPhone,
  division: z.string().trim().min(1, 'Division is required.'),
  district: z.string().trim().min(1, 'District is required.'),
  upazila: z.string().trim().optional(),
  area: z.string().trim().optional(),
  addressLine: z.string().trim().min(1, 'Delivery address is required.'),

  paymentMethod: z.enum(['cod', 'sslcommerz', 'bkash_direct']).default('cod'),
  note: z.string().trim().max(500).optional(),
  sourceChannel: z.string().trim().max(64).optional(),
  utmSource: z.string().trim().max(64).optional(),
  utmCampaign: z.string().trim().max(64).optional(),
});

/** Maps a service error code onto an HTTP status (§9). */
const STATUS_BY_CODE: Record<string, number> = {
  EMPTY_ORDER: 422,
  INVALID_QTY: 422,
  PRODUCT_UNAVAILABLE: 409,
  PRESCRIPTION_REQUIRED: 409,
  COLD_CHAIN_UNAVAILABLE: 409,
  OUT_OF_STOCK: 409,
};

export async function POST(req: NextRequest) {
  // §9: the Idempotency-Key is mandatory. BD mobile data drops mid-request
  // constantly; without it a retry produces a duplicate order and a duplicate
  // courier consignment.
  const idempotencyKey = req.headers.get('idempotency-key')?.trim();
  if (!idempotencyKey) {
    return apiError(
      'IDEMPOTENCY_KEY_REQUIRED',
      'An Idempotency-Key header is required when placing an order.',
      400
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body is not valid JSON', 400);
  }

  const parsed = expressOrderSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError(
      'VALIDATION_ERROR',
      first?.message ?? 'Order data is invalid',
      422,
      first?.path.join('.'),
      parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
    );
  }

  try {
    const result = await placeGuestOrder({ ...parsed.data, idempotencyKey });

    if (!result.success) {
      return apiError(
        result.errorCode ?? 'ORDER_FAILED',
        result.error ?? 'Could not place the order.',
        STATUS_BY_CODE[result.errorCode ?? ''] ?? 400,
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
  } catch (err) {
    console.error('[POST /api/v1/orders/express] Failed:', err);
    return apiError(
      'ORDER_FAILED',
      err instanceof Error ? err.message : 'Could not place the order.',
      500
    );
  }
}
