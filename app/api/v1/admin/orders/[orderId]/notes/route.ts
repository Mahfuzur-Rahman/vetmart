// app/api/v1/admin/orders/[orderId]/notes/route.ts
// POST /api/v1/admin/orders/:orderId/notes — Append an internal note (§14.2)
//
// COD confirmation calls are the highest-value operational habit in this market
// (§12 rule 3), so the record of them belongs in the order's timeline rather
// than in one operator's browser. order_events already models exactly this: an
// actor, a note and a timestamp, with the status unchanged.
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { orders, orderEvents } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/api/guard';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ orderId: string }> };

const noteSchema = z.object({
  note: z.string().trim().min(1, 'Note text is required.').max(1000),
  /** Free-form label such as a call outcome: answered, no_answer, cancelled. */
  outcome: z.string().trim().max(64).optional(),
});

export async function POST(req: NextRequest, { params }: Props) {
  const guard = await requireAdmin('order.write');
  if (!guard.ok) return guard.response;

  const { orderId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body is not valid JSON', 400);
  }

  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError('VALIDATION_ERROR', first?.message ?? 'Invalid note', 422, first?.path.join('.'));
  }

  try {
    const [order] = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return apiError('ORDER_NOT_FOUND', `No order found for "${orderId}"`, 404);
    }

    const note = parsed.data.outcome
      ? `[${parsed.data.outcome}] ${parsed.data.note}`
      : parsed.data.note;

    // fromStatus === toStatus: the timeline records the note, not a transition.
    const [event] = await db
      .insert(orderEvents)
      .values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: order.status,
        actor: `admin:${guard.admin.name}`,
        note,
      })
      .returning({ id: orderEvents.id, at: orderEvents.at });

    return apiSuccess({ id: event.id, at: event.at.toISOString(), note }, undefined, 201);
  } catch (err) {
    console.error('[POST /api/v1/admin/orders/:id/notes] Failed:', err);
    return apiError(
      'NOTE_CREATE_FAILED',
      err instanceof Error ? err.message : 'Could not save the note',
      500
    );
  }
}
