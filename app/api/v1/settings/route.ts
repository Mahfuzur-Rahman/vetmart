// app/api/v1/settings/route.ts
// Public settings endpoint for storefront and checkout pricing calculation (§6, §14.3)
import { NextResponse } from 'next/server';
import { getShippingSettings } from '@/lib/services/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const shipping = await getShippingSettings();
    return NextResponse.json({
      success: true,
      data: {
        shipping,
      },
    });
  } catch (err) {
    console.error('Failed to get public settings:', err);
    return NextResponse.json(
      { success: false, error: 'Could not load settings' },
      { status: 500 }
    );
  }
}
