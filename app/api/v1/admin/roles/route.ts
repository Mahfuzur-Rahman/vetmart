// app/api/v1/admin/roles/route.ts
// GET /api/v1/admin/roles — List all system roles and permission mappings (§14.1)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { roles, permissions, rolePermissions } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/api/guard';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const guard = await requireAdmin('admin.manage');
  if (!guard.ok) return guard.response;

  try {
    const allRoles = await db.select().from(roles);
    const allPermissions = await db.select().from(permissions);
    const allRolePerms = await db.select().from(rolePermissions);

    const permissionMap = new Map(allPermissions.map((p) => [p.id, p.key]));

    const rolesWithPermissions = allRoles.map((r) => {
      const rolePermIds = allRolePerms
        .filter((rp) => rp.roleId === r.id)
        .map((rp) => permissionMap.get(rp.permissionId))
        .filter(Boolean) as string[];

      return {
        id: r.id,
        key: r.key,
        nameEn: r.nameEn,
        nameBn: r.nameBn,
        description: r.description,
        permissions: r.key === 'super_admin' ? ['*'] : rolePermIds,
      };
    });

    return apiSuccess({
      roles: rolesWithPermissions,
      permissions: allPermissions.map((p) => ({
        id: p.id,
        key: p.key,
        description: p.description,
      })),
    });
  } catch (err) {
    console.error('[GET /api/v1/admin/roles] Failed:', err);
    return apiError('INTERNAL_ERROR', 'Failed to fetch roles and permissions', 500);
  }
}
