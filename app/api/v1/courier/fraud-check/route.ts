// app/api/v1/courier/fraud-check/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { checkCustomerFraudRisk, normalizeBdPhone } from '@/lib/courier/fraud-check';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');

  if (!phone) {
    return NextResponse.json({ error: 'Phone parameter required' }, { status: 400 });
  }

  const cleanPhone = normalizeBdPhone(phone);
  if (!cleanPhone || cleanPhone.length < 11) {
    return NextResponse.json({ error: 'Invalid Bangladeshi phone number' }, { status: 400 });
  }

  try {
    const report = await checkCustomerFraudRisk(cleanPhone);
    return NextResponse.json({ success: true, data: report });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: 'Fraud check failed', details: errorMessage }, { status: 500 });
  }
}
