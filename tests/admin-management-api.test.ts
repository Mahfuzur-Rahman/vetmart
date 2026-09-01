// tests/admin-management-api.test.ts
// Tests for Admin Management and Live Access Control (§14.1)
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

describe('Admin Management API & Security Guards', () => {
  it('guards GET and POST /api/v1/admin/admins with admin.manage requirement', () => {
    const src = readSource('app/api/v1/admin/admins/route.ts');
    expect(src).toContain("requireAdmin('admin.manage')");
    expect(src).toContain('hashPassword(password)');
  });

  it('guards PATCH and DELETE /api/v1/admin/admins/[id] with admin.manage requirement', () => {
    const src = readSource('app/api/v1/admin/admins/[id]/route.ts');
    expect(src).toContain("requireAdmin('admin.manage')");
  });

  it('prevents a Super Admin from deactivating their own logged-in account', () => {
    const src = readSource('app/api/v1/admin/admins/[id]/route.ts');
    expect(src).toContain('targetId === guard.admin.id && isActive === false');
    expect(src).toContain('CANNOT_DEACTIVATE_SELF');
  });

  it('prevents a Super Admin from deleting their own logged-in account', () => {
    const src = readSource('app/api/v1/admin/admins/[id]/route.ts');
    expect(src).toContain('targetId === guard.admin.id');
    expect(src).toContain('CANNOT_DELETE_SELF');
  });

  it('prevents deleting the only remaining Super Admin account', () => {
    const src = readSource('app/api/v1/admin/admins/[id]/route.ts');
    expect(src).toContain('allSuperAdmins.length <= 1');
    expect(src).toContain('LAST_SUPERADMIN');
  });

  it('provides Admin Management navigation item with admin.manage permission check in AdminSidebar', () => {
    const src = readSource('components/admin/AdminSidebar.tsx');
    expect(src).toContain("href: '/admin/admins'");
    expect(src).toContain("permission: 'admin.manage'");
  });

  it('protects the Admin Management page server component against unauthorized access', () => {
    const src = readSource('app/[locale]/admin/(dashboard)/admins/page.tsx');
    expect(src).toContain("auth.has('admin.manage')");
    expect(src).toContain('AdminManagementClient');
  });

  it('supports direct user-level permission grants in schema and permissions resolver', () => {
    const schemaSrc = readSource('lib/db/schema/auth.ts');
    expect(schemaSrc).toContain('adminPermissions');
    expect(schemaSrc).toContain('admin_permissions');

    const permSrc = readSource('lib/auth/permissions.ts');
    expect(permSrc).toContain('adminPermissions');
  });

  it('handles direct user-level permission updates and account revocation in PATCH route', () => {
    const patchSrc = readSource('app/api/v1/admin/admins/[id]/route.ts');
    expect(patchSrc).toContain('directPermKeys');
    expect(patchSrc).toContain('adminPermissions');
    expect(patchSrc).toContain('DELETE(req');
  });
});
