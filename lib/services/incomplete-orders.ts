// lib/services/incomplete-orders.ts
// Service layer for Incomplete Orders & Social Campaign Abandoned Lead Capture
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { incompleteOrders } from '@/lib/db/schema';
import { isDemoMode } from '@/lib/demo';
import {
  type IncompleteOrder,
  type IncompleteOrderStatus,
  isValidBdPhone,
  sanitizeBdPhone,
  INITIAL_MOCK_INCOMPLETE_ORDERS,
} from '@/lib/mock-data/incomplete-orders';

export interface IncompleteOrderInput {
  id?: string;
  phone: string;
  name?: string | null;
  address?: string | null;
  division?: string | null;
  district?: string | null;
  upazila?: string | null;
  items: Array<{
    productId: string;
    productSlug: string;
    productNameEn: string;
    productNameBn: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
    packSize?: string | null;
    imageUrl?: string | null;
  }>;
  subtotal: number;
  deliveryFee?: number;
  totalAmount: number;
  utmSource?: string | null;
  utmCampaign?: string | null;
  utmMedium?: string | null;
}

/**
 * Capture or update an incomplete order lead in the system.
 */
export async function captureIncompleteOrder(input: IncompleteOrderInput): Promise<{ id: string; status: IncompleteOrderStatus }> {
  const sanitizedPhone = sanitizeBdPhone(input.phone);
  if (!isValidBdPhone(sanitizedPhone)) {
    throw new Error('INVALID_PHONE: Valid 11-digit Bangladesh phone number required');
  }

  const deliveryFee = input.deliveryFee ?? 7000;
  const totalAmount = input.totalAmount || (input.subtotal + deliveryFee);
  const now = new Date();

  if (isDemoMode() || !db) {
    const id = input.id || `inc-ord-${Date.now()}`;
    return { id, status: 'incomplete' };
  }

  try {
    if (input.id) {
      // Update existing draft
      await db
        .update(incompleteOrders)
        .set({
          phone: sanitizedPhone,
          name: input.name ?? null,
          address: input.address ?? null,
          division: input.division ?? null,
          district: input.district ?? null,
          upazila: input.upazila ?? null,
          items: input.items,
          subtotal: input.subtotal,
          deliveryFee,
          totalAmount,
          utmSource: input.utmSource ?? null,
          utmCampaign: input.utmCampaign ?? null,
          utmMedium: input.utmMedium ?? null,
          updatedAt: now,
        })
        .where(eq(incompleteOrders.id, input.id));

      return { id: input.id, status: 'incomplete' };
    } else {
      // Insert new lead
      const [record] = await db
        .insert(incompleteOrders)
        .values({
          phone: sanitizedPhone,
          name: input.name ?? null,
          address: input.address ?? null,
          division: input.division ?? null,
          district: input.district ?? null,
          upazila: input.upazila ?? null,
          items: input.items,
          subtotal: input.subtotal,
          deliveryFee,
          totalAmount,
          utmSource: input.utmSource ?? null,
          utmCampaign: input.utmCampaign ?? null,
          utmMedium: input.utmMedium ?? null,
          status: 'incomplete',
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: incompleteOrders.id, status: incompleteOrders.status });

      return { id: record.id, status: record.status as IncompleteOrderStatus };
    }
  } catch (err: any) {
    console.error('Failed to capture incomplete order in DB, returning fallback id:', err?.message);
    const id = input.id || `inc-ord-${Date.now()}`;
    return { id, status: 'incomplete' };
  }
}

/**
 * List incomplete orders for admin review.
 */
export async function getIncompleteOrders(statusFilter?: string): Promise<IncompleteOrder[]> {
  if (isDemoMode()) {
    return statusFilter
      ? INITIAL_MOCK_INCOMPLETE_ORDERS.filter((l) => l.status === statusFilter)
      : INITIAL_MOCK_INCOMPLETE_ORDERS;
  }

  // No try/catch returning seed data. A database failure used to surface as a
  // list of invented leads, so an operator would have called fabricated phone
  // numbers believing they were real abandoned carts.
  // statusFilter was previously accepted and then ignored, so every caller
  // asking for one status got the entire table back.
  const rows = await db
    .select()
    .from(incompleteOrders)
    .where(statusFilter ? eq(incompleteOrders.status, statusFilter) : undefined)
    .orderBy(desc(incompleteOrders.createdAt));

  return rows.map((r: any) => ({
    id: r.id,
    phone: r.phone,
    name: r.name,
    address: r.address,
    division: r.division,
    district: r.district,
    upazila: r.upazila,
    items: r.items as any,
    subtotal: r.subtotal,
    deliveryFee: r.deliveryFee,
    totalAmount: r.totalAmount,
    utmSource: r.utmSource,
    utmCampaign: r.utmCampaign,
    utmMedium: r.utmMedium,
    status: r.status as IncompleteOrderStatus,
    adminNotes: r.adminNotes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

/**
 * Update incomplete order status or notes.
 */
export async function updateIncompleteOrderStatus(
  id: string,
  status: IncompleteOrderStatus,
  adminNotes?: string
): Promise<boolean> {
  if (isDemoMode() || !db) {
    return true;
  }

  try {
    await db
      .update(incompleteOrders)
      .set({
        status,
        ...(adminNotes !== undefined ? { adminNotes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(incompleteOrders.id, id));
    return true;
  } catch (err: any) {
    console.error('Failed to update incomplete order status:', err?.message);
    return false;
  }
}
