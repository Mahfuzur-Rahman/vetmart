// app/api/v1/admin/auth/login/route.ts
// POST /api/v1/admin/auth/login — Issue an admin session cookie (§8, §14.1)
//
// Admin auth is a separate table and a separate cookie from customer auth; an
// admin is not a user with a flag (§8).
//
// Before this existed, setAdminSession() was never called anywhere. The admin
// "logged in" entirely in the browser (localStorage plus a non-httpOnly cookie
// holding a role string), so no admin API route could authenticate anyone and
// the RBAC gate in the admin layout was commented out.
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { verifyPassword } from '@/lib/auth/hash';
import { setAdminSession } from '@/lib/auth/session';
import { getAdminPermissions } from '@/lib/auth/permissions';
import { rateLimit } from '@/lib/auth/rate-limit';
import { isDemoMode } from '@/lib/demo';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body is not valid JSON', 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError('VALIDATION_ERROR', first?.message ?? 'Invalid credentials payload', 422, first?.path.join('.'));
  }

  const { email, password } = parsed.data;

  // Throttle credential stuffing. Keyed by IP; a shared office NAT is an
  // acceptable cost here given how few admin accounts exist.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  try {
    const limit = await rateLimit(`admin-login:${ip}`, 10, 300);
    if (!limit.success) {
      return apiError('RATE_LIMITED', 'Too many login attempts. Try again in a few minutes.', 429);
    }
  } catch (err) {
    // Valkey being unreachable must not lock the owner out of their own admin.
    console.warn('[admin login] Rate limiter unavailable, continuing:', err);
  }

  if (isDemoMode()) {
    return apiError(
      'DEMO_MODE_NO_ADMIN_AUTH',
      'Admin login requires a database. Set DEMO_MODE=false and configure DATABASE_URL.',
      409
    );
  }

  try {
    const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);

    // Same response for "no such admin" and "wrong password" so the endpoint
    // cannot be used to enumerate which admin accounts exist.
    if (!admin || !admin.isActive || !verifyPassword(password, admin.passwordHash)) {
      return apiError('INVALID_CREDENTIALS', 'Email or password is incorrect.', 401);
    }

    await setAdminSession(admin.id);
    await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));

    const permissions = await getAdminPermissions(admin.id);

    return apiSuccess({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      permissions: Array.from(permissions),
    });
  } catch (err) {
    console.error('[POST /api/v1/admin/auth/login] Failed:', err);
    return apiError('LOGIN_FAILED', err instanceof Error ? err.message : 'Login failed', 500);
  }
}
