// lib/api/guard.ts
// Permission gate for admin API routes (§14.1).
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import type { PermissionKey } from '@/lib/auth/permissions';
import { apiError } from '@/lib/api/response';

export interface AdminContext {
  id: string;
  name: string;
  has: (key: PermissionKey) => boolean;
}

export type GuardResult =
  | { ok: true; admin: AdminContext }
  /** A ready-to-return NextResponse carrying the §9 error envelope. */
  | { ok: false; response: ReturnType<typeof apiError> };

/**
 * Require an authenticated admin holding `permission`.
 */
export async function requireAdmin(permission: PermissionKey): Promise<GuardResult> {
  let auth: Awaited<ReturnType<typeof getAuthenticatedAdmin>>;
  try {
    auth = await getAuthenticatedAdmin();
  } catch (err) {
    console.error('[requireAdmin] Could not resolve admin session:', err);
    return {
      ok: false,
      response: apiError('AUTH_UNAVAILABLE', 'Could not verify the admin session.', 503),
    };
  }

  if (!auth) {
    return {
      ok: false,
      response: apiError('UNAUTHORIZED', 'Admin login required.', 401),
    };
  }

  if (!auth.has(permission)) {
    return {
      ok: false,
      response: apiError(
        'FORBIDDEN',
        `Insufficient permissions (${permission} required).`,
        403
      ),
    };
  }

  return {
    ok: true,
    admin: { id: auth.admin.id, name: auth.admin.name, has: auth.has },
  };
}
