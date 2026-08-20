// tests/admin-permissions.test.ts
//
// getAdminPermissions() resolved roles and permissions in one chain of inner
// joins through role_permissions and permissions, and only checked for
// super_admin while iterating the resulting rows. Both tables were empty
// (scripts/seed.ts never populated them), so the join returned nothing and even
// a super admin came back with an empty permission set — every admin write
// would have been refused with 403 once the routes were actually guarded.
//
// The live database confirmed this: permissions and role_permissions both had
// 0 rows while admin_roles had 2.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

describe('getAdminPermissions()', () => {
  const src = readSource('lib/auth/permissions.ts');

  it('resolves the admin roles before touching the permission catalog', () => {
    // The roles query must not join through role_permissions, or an unseeded
    // permission catalog silently strips the super admin of access.
    const rolesQuery = src.slice(
      src.indexOf('const assignedRoles'),
      src.indexOf('if (assignedRoles.length === 0)')
    );
    expect(rolesQuery).toContain('adminRoles');
    expect(rolesQuery).toContain('roles');
    expect(rolesQuery).not.toContain('rolePermissions');
    expect(rolesQuery).not.toContain('permissions.key');
  });

  it('grants a super admin everything based on the role assignment alone', () => {
    expect(src).toContain("assignedRoles.some((r) => r.roleKey === 'super_admin')");
    expect(src).toContain("return new Set(['*'])");
  });

  it('returns an empty set for an admin with no roles', () => {
    expect(src).toContain('if (assignedRoles.length === 0) return new Set()');
  });
});

describe('the seeder populates the permission catalog (§14.1)', () => {
  const seed = readSource('scripts/seed.ts');

  it('inserts the permission keys the RBAC guard checks for', () => {
    // Every key requireAdmin() is called with must exist as a row, or the role
    // holding it can never be granted it.
    for (const key of ['product.write', 'order.read', 'order.write']) {
      expect(seed, `seed.ts never inserts "${key}"`).toContain(`'${key}'`);
    }
  });

  it('grants permissions to the non-super-admin roles', () => {
    expect(seed).toContain('rolePermissions');
    expect(seed).toContain('roleGrants');
  });

  it('gives the inventory role product.write so it can manage the catalog', () => {
    const grants = seed.slice(seed.indexOf('const roleGrants'), seed.indexOf('const allRoles'));
    const inventoryLine = grants.split('\n').find((l) => l.trim().startsWith('inventory:'));
    expect(inventoryLine).toBeDefined();
    expect(inventoryLine).toContain('product.write');
  });

  it('does not grant rows to super_admin, which is resolved by role', () => {
    const grants = seed.slice(seed.indexOf('const roleGrants'), seed.indexOf('const allRoles'));
    expect(grants).not.toContain('super_admin:');
  });
});
