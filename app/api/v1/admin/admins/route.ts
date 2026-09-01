// app/api/v1/admin/admins/route.ts
// GET /api/v1/admin/admins — List all admins with roles & permissions (§14.1)
// POST /api/v1/admin/admins — Create a new admin operator (§14.1)
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { admins, roles, adminRoles, permissions as permissionsTable, adminPermissions, auditLog } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/api/guard';
import { getAdminPermissions } from '@/lib/auth/permissions';
import { hashPassword } from '@/lib/auth/hash';
import { apiSuccess, apiError } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

const createAdminSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  roleKeys: z.array(z.string()).optional().default([]),
  permissions: z.array(z.string()).optional().default([]),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin('admin.manage');
  if (!guard.ok) return guard.response;

  try {
    const allAdmins = await db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        isActive: admins.isActive,
        lastLoginAt: admins.lastLoginAt,
        createdAt: admins.createdAt,
      })
      .from(admins)
      .orderBy(desc(admins.createdAt));

    const allAdminRoles = await db
      .select({
        adminId: adminRoles.adminId,
        roleId: roles.id,
        roleKey: roles.key,
        nameEn: roles.nameEn,
        nameBn: roles.nameBn,
      })
      .from(adminRoles)
      .innerJoin(roles, eq(adminRoles.roleId, roles.id));

    const result = await Promise.all(
      allAdmins.map(async (admin) => {
        const userRoles = allAdminRoles
          .filter((ar) => ar.adminId === admin.id)
          .map((ar) => ({
            id: ar.roleId,
            key: ar.roleKey,
            nameEn: ar.nameEn,
            nameBn: ar.nameBn,
          }));

        const permissions = await getAdminPermissions(admin.id);

        return {
          ...admin,
          roles: userRoles,
          permissions: Array.from(permissions),
        };
      })
    );

    return apiSuccess({
      admins: result,
      currentAdminId: guard.admin.id,
    });
  } catch (err) {
    console.error('[GET /api/v1/admin/admins] Failed:', err);
    return apiError('INTERNAL_ERROR', 'Failed to load admins directory', 500);
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin('admin.manage');
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = createAdminSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return apiError('VALIDATION_ERROR', first?.message ?? 'Invalid payload', 422, first?.path.join('.'));
  }

  const { name, email, password, roleKeys, permissions: directPermKeys, isActive } = parsed.data;

  try {
    // 1. Check if email already exists
    const [existing] = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, email)).limit(1);
    if (existing) {
      return apiError('ADMIN_EXISTS', 'An admin with this email address already exists.', 409, 'email');
    }

    // 2. Resolve roles if provided
    let matchedRoles: (typeof roles.$inferSelect)[] = [];
    if (roleKeys && roleKeys.length > 0) {
      matchedRoles = await db.select().from(roles).where(inArray(roles.key, roleKeys));
    }

    // 3. Hash password and insert
    const passwordHash = hashPassword(password);
    const [newAdmin] = await db
      .insert(admins)
      .values({
        name,
        email,
        passwordHash,
        isActive,
      })
      .returning({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        isActive: admins.isActive,
        createdAt: admins.createdAt,
      });

    if (!newAdmin) {
      return apiError('INSERT_FAILED', 'Could not create admin record.', 500);
    }

    // 4. Insert role assignments if any
    for (const role of matchedRoles) {
      await db.insert(adminRoles).values({
        adminId: newAdmin.id,
        roleId: role.id,
      }).onConflictDoNothing();
    }

    // 5. Insert direct user-level permission grants if provided
    if (directPermKeys && directPermKeys.length > 0) {
      const allPerms = await db.select().from(permissionsTable).where(inArray(permissionsTable.key, directPermKeys));
      for (const p of allPerms) {
        await db.insert(adminPermissions).values({
          adminId: newAdmin.id,
          permissionId: p.id,
        }).onConflictDoNothing();
      }
    }

    // 6. Audit log
    await db.insert(auditLog).values({
      adminId: guard.admin.id,
      action: 'create',
      entity: 'admin',
      entityId: newAdmin.id,
      after: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        roles: matchedRoles.map((r) => r.key),
        directPermissions: directPermKeys,
      },
    });

    const permissions = await getAdminPermissions(newAdmin.id);

    return apiSuccess(
      {
        ...newAdmin,
        roles: matchedRoles.map((r) => ({
          id: r.id,
          key: r.key,
          nameEn: r.nameEn,
          nameBn: r.nameBn,
        })),
        permissions: Array.from(permissions),
      },
      undefined,
      201
    );
  } catch (err) {
    console.error('[POST /api/v1/admin/admins] Failed:', err);
    return apiError('INTERNAL_ERROR', err instanceof Error ? err.message : 'Failed to create admin', 500);
  }
}
