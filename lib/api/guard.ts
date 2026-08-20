// lib/api/guard.ts
// Permission gate for admin API routes (§14.1).
//
// One server-side resolver, used by every admin route, rather than per-route
// ad-hoc checks. Before this existed the admin write endpoints had NO
// authentication at all: on a public deployment anyone who knew the URL could
// create, edit or delete catalog rows.
import { getAuthenticatedAdmin } from '@/lib/auth/permissions';
import type { PermissionKey } from '@/lib/auth/permissions';
import { isDemoMode } from '@/lib/demo';
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
 *
 * Demo mode has no database and therefore no admins table, so it is allowed
 * through with a synthetic context. That is safe because every write path also
 * refuses to run in demo mode (see DemoModeWriteError) — demo mode is read-only
 * by construction, so there is nothing to authorize.
 */
export async function requireAdmin(permission: PermissionKey): Promise<GuardResult> {
  if (isDemoMode()) {
    return {
      ok: true,
      admin: { id: 'demo-admin', name: 'Demo Admin', has: () => true },
    };
  }

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
