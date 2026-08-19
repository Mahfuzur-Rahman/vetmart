// app/api/v1/courier/dispatch-bulk/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { bulkDispatchOrders, type DispatchableOrder } from '@/lib/services/courier-booking';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orders } = body as { orders: DispatchableOrder[] };

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'Array of orders is required' }, { status: 400 });
    }

    const report = await bulkDispatchOrders(orders);
    return NextResponse.json({ success: true, report });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: 'Bulk dispatch failed', details: errorMessage }, { status: 500 });
  }
}
