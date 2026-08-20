// app/api/v1/incomplete-orders/route.ts
// Public lead capture endpoint for Social Media Express Order Landing pages
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiSuccess, apiError } from '@/lib/api/response';
import { captureIncompleteOrder } from '@/lib/services/incomplete-orders';
import { isValidBdPhone } from '@/lib/validation/phone';

const leadItemSchema = z.object({
  productId: z.string(),
  productSlug: z.string(),
  productNameEn: z.string(),
  productNameBn: z.string(),
  unitPrice: z.number().int(),
  quantity: z.number().int().min(1),
  totalPrice: z.number().int(),
  packSize: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

const captureLeadSchema = z.object({
  id: z.string().optional(),
  phone: z.string().min(10),
  name: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  division: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  upazila: z.string().nullable().optional(),
  items: z.array(leadItemSchema).min(1),
  subtotal: z.number().int().nonnegative(),
  deliveryFee: z.number().int().nonnegative().optional(),
  totalAmount: z.number().int().nonnegative(),
  utmSource: z.string().nullable().optional(),
  utmCampaign: z.string().nullable().optional(),
  utmMedium: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = captureLeadSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(
        'VALIDATION_ERROR',
        'Invalid lead payload. Valid phone number and items array are required.',
        422,
        undefined,
        parsed.error.flatten()
      );
    }

    if (!isValidBdPhone(parsed.data.phone)) {
      return apiError('INVALID_PHONE', 'Please provide a valid 11-digit Bangladesh phone number (01...)', 422);
    }

    const result = await captureIncompleteOrder(parsed.data);
    return apiSuccess({ leadId: result.id, status: result.status }, { capturedAt: new Date().toISOString() });
  } catch (err: any) {
    return apiError('LEAD_CAPTURE_FAILED', err?.message || 'Failed to capture lead', 500);
  }
}
