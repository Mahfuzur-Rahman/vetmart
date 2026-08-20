// app/api/v1/admin/auth/logout/route.ts
// POST /api/v1/admin/auth/logout — Clear the admin session cookie (§8)
import { clearAdminSession } from '@/lib/auth/session';
import { apiSuccess } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function POST() {
  await clearAdminSession();
  return apiSuccess({ ok: true });
}
