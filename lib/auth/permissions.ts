// lib/auth/permissions.ts
// Granular Permission-based RBAC for Admin Panel (§14.1)
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins, adminRoles, roles, rolePermissions, permissions } from '@/lib/db/schema';
import { getAdminSessionId } from './session';

export type PermissionKey =
  | 'product.read'
  | 'product.write'
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
 */
export async function getAdminPermissions(adminId: string): Promise<Set<string>> {
  // Query all permissions through admin_roles -> role_permissions -> permissions
  const rows = await db
    .select({
      roleKey: roles.key,
      permissionKey: permissions.key,
    })
    .from(adminRoles)
    .innerJoin(roles, eq(adminRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(adminRoles.adminId, adminId));

  const permSet = new Set<string>();

  for (const r of rows) {
    // Super admin has all permissions implicitly
    if (r.roleKey === 'super_admin') {
      return new Set(['*']);
    }
    permSet.add(r.permissionKey);
  }

  return permSet;
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
