// lib/services/audit.ts
// Immutable audit logging for all admin panel operations (§6, §14.4)
import { db } from '@/lib/db';
import { auditLog } from '@/lib/db/schema';

export interface AuditLogParams {
  adminId?: string;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'stock_adjust' | 'login' | 'approve' | 'reject';
  entity: 'product' | 'batch' | 'stock' | 'order' | 'prescription' | 'settings' | 'translation' | 'role' | 'user';
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
}

/**
 * Record an admin action in the audit log.
 * Never deletable from the UI (§14.4).
 */
export async function logAdminAction(params: AuditLogParams) {
  try {
    const [entry] = await db
      .insert(auditLog)
      .values({
        adminId: params.adminId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before || null,
        after: params.after || null,
        ip: params.ip || null,
      })
      .returning();

    return entry;
  } catch (err) {
    console.error('❌ Failed to write audit log:', err);
    // Non-blocking fallback to not crash critical transactions if logging fails
    return null;
  }
}
