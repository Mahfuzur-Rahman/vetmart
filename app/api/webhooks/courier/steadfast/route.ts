// app/api/webhooks/courier/steadfast/route.ts
// Courier status callback (§12 rule 2).
//
// Authentication and payload handling live in lib/courier/webhook.ts, shared
// with /api/v1/webhook/steadfast so the two registered paths cannot drift.
import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateCourierWebhook,
  handleCourierWebhookPayload,
} from '@/lib/courier/webhook';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = authenticateCourierWebhook(req);
  if (!auth.ok) {
    return NextResponse.json(
      { error: { code: auth.code, message: auth.message } },
      { status: auth.status }
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'INVALID_JSON', message: 'Body is not valid JSON' } },
      { status: 400 }
    );
  }

  try {
    const result = await handleCourierWebhookPayload(payload);

    if (!result.ok) {
      return NextResponse.json(
        { error: { code: 'INVALID_PAYLOAD', message: result.error } },
        { status: 400 }
      );
    }

    const outcome = result.outcome!;
    if (!outcome.applied) {
      // Unknown consignment. 200 on purpose: the courier retries on non-2xx and
      // a payload we can never match would retry forever.
      console.error(
        `[courier webhook] Consignment ${outcome.consignmentId} not matched to a shipment:`,
        outcome.error
      );
    }

    return NextResponse.json({
      received: true,
      consignmentId: outcome.consignmentId,
      courierStatus: outcome.courierStatus,
      applied: outcome.applied,
    });
  } catch (err) {
    console.error('[courier webhook] Unhandled error:', err);
    // 200 so the courier stops retrying; the error is ours to fix from the log.
    return NextResponse.json({ received: true, error: 'internal' });
  }
}
