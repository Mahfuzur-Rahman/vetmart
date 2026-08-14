// app/api/v1/auth/me/route.ts
import { NextRequest } from 'next/server';
import { resolveUser } from '@/lib/auth/resolve';
import { apiSuccess, apiError } from '@/lib/api/response';

export async function GET(req: NextRequest) {
  const user = await resolveUser(req);

  if (!user) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  return apiSuccess({
    user: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      locale: user.locale,
      tier: user.tier,
      isVerifiedVet: user.isVerifiedVet,
      bvcRegNo: user.bvcRegNo,
      creditLimit: user.creditLimit,
    },
  });
}
