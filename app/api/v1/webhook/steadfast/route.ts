// app/api/v1/webhook/steadfast/route.ts
// POST /api/v1/webhook/steadfast — Receive Steadfast delivery status callbacks (§12)
// This endpoint is called by Steadfast when delivery status changes.
// It is NOT behind auth — Steadfast POSTs here directly. We verify via secret key.
import { NextRequest, NextResponse } from 'next/server';
import { processSteadfastWebhook } from '@/lib/services/fulfillment';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Steadfast sends: { consignment_id, tracking_code, status, ... }
    // Possible statuses from Steadfast:
    //   in_review, pending, cancelled, unknown_pickup,
    //   pickup_assigned, picked_up, received_at_warehouse,
    //   in_transit, delivered_to_hub, out_for_delivery,
    //   delivered, partial_delivered, cancelled_delivery,
    //   hold, return, returned, returned_to_warehouse
    const consignmentId = body?.consignment_id;
    const trackingCode = body?.tracking_code;
    const status = body?.status;

    if (!consignmentId || !status) {
      return NextResponse.json(
        { error: 'Missing consignment_id or status' },
        { status: 400 }
      );
    }

    const result = await processSteadfastWebhook({
      consignmentId: String(consignmentId),
      trackingCode: trackingCode ? String(trackingCode) : undefined,
      status: String(status),
      raw: body,
    });

    if (!result.success) {
      // Return 200 anyway so Steadfast doesn't retry — log the error server-side
      console.error(`[SteadfastWebhook] Processing failed for ${consignmentId}:`, result.error);
    }

    // Always return 200 to Steadfast to acknowledge receipt
    return NextResponse.json({ received: true, consignmentId });
  } catch (err: any) {
    console.error('[SteadfastWebhook] Unhandled error:', err);
    // Still return 200 to prevent Steadfast retry loops
    return NextResponse.json({ received: true, error: 'internal' });
  }
}
