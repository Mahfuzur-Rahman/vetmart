// app/api/webhooks/courier/steadfast/route.ts
// Live Courier Webhook Listener (§12, §14)
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-steadfast-signature') || req.headers.get('authorization');
    // Optional webhook verification against secret
    if (env.STEADFAST_SECRET_KEY && signature) {
      // Valid signature check if needed
    }

    const payload = await req.json();
    const { consignment_id, tracking_code, status, invoice, collected_amount } = payload;

    if (!consignment_id && !tracking_code && !invoice) {
      return NextResponse.json({ error: 'Missing identifying courier data' }, { status: 400 });
    }

    // Map Steadfast status to internal order status
    let internalStatus: 'dispatched' | 'delivered' | 'cancelled' | 'returned' = 'dispatched';
    const s = String(status || '').toLowerCase();

    if (s.includes('deliver') || s === 'completed') {
      internalStatus = 'delivered';
    } else if (s.includes('return')) {
      internalStatus = 'returned';
    } else if (s.includes('cancel')) {
      internalStatus = 'cancelled';
    }

    // Log the incoming webhook event
    console.log(`[Courier Webhook] Consignment #${consignment_id} (Invoice: ${invoice}) -> Status: ${internalStatus}, Collected: ৳${collected_amount || 0}`);

    return NextResponse.json({
      success: true,
      received: {
        consignmentId: String(consignment_id),
        trackingCode: tracking_code,
        internalStatus,
        processedAt: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown webhook error';
    return NextResponse.json({ error: 'Webhook processing failed', details: errorMessage }, { status: 500 });
  }
}
