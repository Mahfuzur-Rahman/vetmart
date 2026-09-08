// app/api/v1/webhook/steadfast/route.ts
// Legacy courier status callback path, kept because the courier portal may
// already point at it. Delegates to the same verified handler as
// /api/webhooks/courier/steadfast (§12 rule 2) — prefer that path for new
// configuration.
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
      console.error(
        `[SteadfastWebhook] Consignment ${outcome.consignmentId} not matched to a shipment:`,
        outcome.error
      );
    }

    return NextResponse.json({
      received: true,
      consignmentId: outcome.consignmentId,
      applied: outcome.applied,
    });
  } catch (err) {
    console.error('[SteadfastWebhook] Unhandled error:', err);
    // 200 to prevent a courier retry loop; the failure is logged server-side.
    return NextResponse.json({ received: true, error: 'internal' });
  }
}
