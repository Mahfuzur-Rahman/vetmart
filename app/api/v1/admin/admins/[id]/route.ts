// app/api/v1/admin/admins/[id]/route.ts
// PATCH /api/v1/admin/admins/[id] — Update admin roles, direct permissions, password or status (§14.1)
// DELETE /api/v1/admin/admins/[id] — Permanently delete or revoke an admin operator (§14.1)
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins, roles, adminRoles, permissions as permissionsTable, adminPermissions, auditLog } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/api/guard';
import { getAdminPermissions } from '@/lib/auth/permissions';
import { hashPassword } from '@/lib/auth/hash';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

const updateAdminSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  password: z.string().min(6).optional(),
  roleKeys: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const guard = await requireAdmin('admin.manage');
  if (!guard.ok) return guard.response;

  const { id: targetId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = updateAdminSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError('VALIDATION_ERROR', first?.message ?? 'Invalid payload', 422, first?.path.join('.'));
  }

  const { name, password, roleKeys, permissions: directPermKeys, isActive } = parsed.data;

  try {
    const [targetAdmin] = await db.select().from(admins).where(eq(admins.id, targetId)).limit(1);
    if (!targetAdmin) {
      return apiError('NOT_FOUND', 'Admin not found', 404);
    }

    // Safeguard 1: Cannot deactivate yourself
    if (targetId === guard.admin.id && isActive === false) {
      return apiError('CANNOT_DEACTIVATE_SELF', 'You cannot deactivate your own admin account.', 400);
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (password) updates.passwordHash = hashPassword(password);
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length > 0) {
      await db.update(admins).set(updates).where(eq(admins.id, targetId));
    }

    // 1. Update role assignments if provided
    let updatedRoleKeys: string[] = [];
    if (roleKeys !== undefined) {
      // Safeguard 2: Cannot remove super_admin from yourself if you are the logged in superadmin
      if (targetId === guard.admin.id) {
        const currentPerms = await getAdminPermissions(guard.admin.id);
        if (currentPerms.has('*') && !roleKeys.includes('super_admin')) {
          return apiError('CANNOT_DEMOTE_SELF', 'You cannot remove Super Admin access from your own account.', 400);
        }
      }

      await db.delete(adminRoles).where(eq(adminRoles.adminId, targetId));

      if (roleKeys.length > 0) {
        const matchedRoles = await db.select().from(roles).where(inArray(roles.key, roleKeys));
        for (const role of matchedRoles) {
          await db.insert(adminRoles).values({
            adminId: targetId,
            roleId: role.id,
          }).onConflictDoNothing();
        }
        updatedRoleKeys = matchedRoles.map((r) => r.key);
      }
    }

    // 2. Update direct user-level permission grants if provided
    if (directPermKeys !== undefined) {
      await db.delete(adminPermissions).where(eq(adminPermissions.adminId, targetId));

      if (directPermKeys.length > 0) {
        const allPerms = await db.select().from(permissionsTable).where(inArray(permissionsTable.key, directPermKeys));
        for (const p of allPerms) {
          await db.insert(adminPermissions).values({
            adminId: targetId,
            permissionId: p.id,
          }).onConflictDoNothing();
        }
      }
    }

    // 3. Audit log
    await db.insert(auditLog).values({
      adminId: guard.admin.id,
      action: 'update',
      entity: 'admin',
      entityId: targetId,
      before: {
        name: targetAdmin.name,
        isActive: targetAdmin.isActive,
      },
      after: {
        name: name ?? targetAdmin.name,
        isActive: isActive ?? targetAdmin.isActive,
        roles: roleKeys !== undefined ? updatedRoleKeys : undefined,
        directPermissions: directPermKeys,
        passwordChanged: !!password,
      },
    });

    const [updatedAdmin] = await db.select().from(admins).where(eq(admins.id, targetId)).limit(1);
    const updatedPerms = await getAdminPermissions(targetId);

    const assignedRoles = await db
      .select({
        id: roles.id,
        key: roles.key,
        nameEn: roles.nameEn,
        nameBn: roles.nameBn,
      })
      .from(adminRoles)
      .innerJoin(roles, eq(adminRoles.roleId, roles.id))
      .where(eq(adminRoles.adminId, targetId));

    return apiSuccess({
      id: updatedAdmin.id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      isActive: updatedAdmin.isActive,
      roles: assignedRoles,
      permissions: Array.from(updatedPerms),
    });
  } catch (err) {
    console.error(`[PATCH /api/v1/admin/admins/${targetId}] Failed:`, err);
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Update failed', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const guard = await requireAdmin('admin.manage');
  if (!guard.ok) return guard.response;

  const { id: targetId } = await params;

  // Safeguard: Cannot delete self
  if (targetId === guard.admin.id) {
    return apiError('CANNOT_DELETE_SELF', 'You cannot delete your own account.', 400);
  }

  try {
    const [targetAdmin] = await db.select().from(admins).where(eq(admins.id, targetId)).limit(1);
    if (!targetAdmin) {
      return apiError('NOT_FOUND', 'Admin not found', 404);
    }

    // Check if target is last superadmin
    const targetPerms = await getAdminPermissions(targetId);
    if (targetPerms.has('*')) {
      const allSuperAdmins = await db
        .select({ id: admins.id })
        .from(adminRoles)
        .innerJoin(roles, eq(adminRoles.roleId, roles.id))
        .innerJoin(admins, eq(adminRoles.adminId, admins.id))
        .where(eq(roles.key, 'super_admin'));

      if (allSuperAdmins.length <= 1) {
        return apiError('LAST_SUPERADMIN', 'Cannot delete the only remaining Super Admin account.', 400);
      }
    }

    // Clean up relations
    await db.delete(adminPermissions).where(eq(adminPermissions.adminId, targetId));
    await db.delete(adminRoles).where(eq(adminRoles.adminId, targetId));
    await db.delete(admins).where(eq(admins.id, targetId));

    await db.insert(auditLog).values({
      adminId: guard.admin.id,
      action: 'delete',
      entity: 'admin',
      entityId: targetId,
      before: {
        name: targetAdmin.name,
        email: targetAdmin.email,
      },
    });

    return apiSuccess({ deleted: true, id: targetId });
  } catch (err) {
    console.error(`[DELETE /api/v1/admin/admins/${targetId}] Failed:`, err);
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Delete failed', 500);
  }
}
