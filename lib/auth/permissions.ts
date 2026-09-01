// lib/auth/permissions.ts
// Granular Permission-based RBAC for Admin Panel (§14.1)
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins, adminRoles, roles, rolePermissions, permissions, adminPermissions } from '@/lib/db/schema';
import { getAdminSessionId } from './session';

export type PermissionKey =
  | 'product.read'
  | 'product.write'
  | 'category.read'
  | 'category.write'
  | 'stock.read'
  | 'stock.adjust'
  | 'order.read'
  | 'order.write'
  | 'order.refund'
  | 'prescription.read'
  | 'prescription.approve'
  | 'customer.read'
  | 'customer.write'
  | 'settings.read'
  | 'settings.write'
  | 'translation.write'
  | 'admin.manage';

/**
 * Fetch all distinct permission keys granted to an admin operator.
 * Resolves both role-based grants and direct user-level grants.
 */
export async function getAdminPermissions(adminId: string): Promise<Set<string>> {
  const assignedRoles = await db
    .select({ roleKey: roles.key, roleId: roles.id })
    .from(adminRoles)
    .innerJoin(roles, eq(adminRoles.roleId, roles.id))
    .where(eq(adminRoles.adminId, adminId));

  if (assignedRoles.length === 0) return new Set();

  // Super admin holds every permission implicitly (§14.1).
  if (assignedRoles.some((r) => r.roleKey === 'super_admin')) {
    return new Set(['*']);
  }

  const grantedRows = await db
    .select({ permissionKey: permissions.key })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      inArray(
        rolePermissions.roleId,
        assignedRoles.map((r) => r.roleId)
      )
    );

  const rolePermKeys = grantedRows.map((r) => r.permissionKey);

  // Direct user-level permission grants
  let directPermKeys: string[] = [];
  try {
    const directRows = await db
      .select({ permissionKey: permissions.key })
      .from(adminPermissions)
      .innerJoin(permissions, eq(adminPermissions.permissionId, permissions.id))
      .where(eq(adminPermissions.adminId, adminId));
    directPermKeys = directRows.map((r) => r.permissionKey);
  } catch (err) {
    // If admin_permissions table is not yet created in a test env, silently continue
  }

  return new Set([...rolePermKeys, ...directPermKeys]);
}

/**
 * Check whether an admin operator has a specific permission.
 */
export async function hasPermission(adminId: string, requiredPermission: PermissionKey): Promise<boolean> {
  const perms = await getAdminPermissions(adminId);
  if (perms.has('*')) return true;
  return perms.has(requiredPermission);
}

/**
 * Get current authenticated admin with their permissions.
 */
export async function getAuthenticatedAdmin() {
  const adminId = await getAdminSessionId();
  if (!adminId) return null;

  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  if (!admin || !admin.isActive) return null;

  const perms = await getAdminPermissions(admin.id);

  return {
    admin,
    permissions: perms,
    has: (key: PermissionKey) => perms.has('*') || perms.has(key),
  };
}
