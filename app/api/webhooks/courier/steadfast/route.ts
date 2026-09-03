// app/api/webhooks/courier/steadfast/route.ts
// Live Courier Webhook Listener (§12, §14)
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { processSteadfastWebhook } from '@/lib/services/fulfillment';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-steadfast-signature') || req.headers.get('authorization');
    // Optional webhook verification against secret
    if (env.STEADFAST_SECRET_KEY && signature) {
      // Valid signature check if needed
    }

    const payload = await req.json();
    const { consignment_id, tracking_code, status, invoice, collected_amount } = payload;

    const cid = consignment_id ? String(consignment_id) : (tracking_code ? String(tracking_code) : '');
    if (!cid && !invoice) {
      return NextResponse.json({ error: 'Missing identifying courier data' }, { status: 400 });
    }

    const courierStatus = String(status || '').toLowerCase();

    // Call service layer to update database and transition order
    const result = await processSteadfastWebhook({
      consignmentId: cid,
      trackingCode: tracking_code ? String(tracking_code) : undefined,
      status: courierStatus,
      raw: payload,
    });

    // Log the incoming webhook event
    console.log(
      `[Courier Webhook] Consignment #${cid} (Invoice: ${invoice}) -> Status: ${courierStatus}, Collected: ৳${collected_amount || 0}, Updated: ${result.success}`
    );

    return NextResponse.json({
      success: true,
      received: {
        consignmentId: cid,
        trackingCode: tracking_code,
        courierStatus,
        applied: result.success,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown webhook error';
    return NextResponse.json({ error: 'Webhook processing failed', details: errorMessage }, { status: 500 });
  }
}
