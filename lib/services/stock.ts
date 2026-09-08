// lib/services/stock.ts
// Regulated Stock Ledger & FEFO Batch Allocation (§2 rule 3, §5.3)
import { eq, and, gt, asc, inArray, sql as dSql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { stockLedger, productBatches, products } from '@/lib/db/schema';

export type StockReason = 'purchase' | 'sale' | 'return' | 'adjust' | 'expiry';

export interface RecordMovementParams {
  productId: string;
  batchId: string;
  delta: number;
  reason: StockReason;
  refType?: string;
  refId?: string;
  adminId?: string;
}

export interface BatchAllocation {
  batchId: string;
  batchNo: string;
  expiryDate: Date;
  qtyAllocated: number;
}

/**
 * Record a stock movement in the immutable stock ledger (§2 rule 3).
 * NEVER directly mutate product stock.
 */
export async function recordStockMovement(params: RecordMovementParams, tx?: any) {
  const dbOrTx = tx || db;
  const [entry] = await dbOrTx
    .insert(stockLedger)
    .values({
      productId: params.productId,
      batchId: params.batchId,
      delta: params.delta,
      reason: params.reason,
      refType: params.refType,
      refId: params.refId,
      adminId: params.adminId,
    })
    .returning();

  return entry;
}

/**
 * Derive the current stock of a specific batch from the ledger.
 */
export async function getBatchCurrentStock(batchId: string): Promise<number> {
  const result = await db
    .select({
      total: dSql<number>`coalesce(sum(${stockLedger.delta}), 0)::int`,
    })
    .from(stockLedger)
    .where(eq(stockLedger.batchId, batchId));

  return result[0]?.total ?? 0;
}

/**
 * Get sellable stock for a product (§5.3).
 * Sellable stock = SUM over batches where expiry_date > now() + interval '60 days'.
 */
export async function getProductStockSummary(productId: string) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + 60);

  // Query batches with their current derived stock
  const batches = await db
    .select({
      batchId: productBatches.id,
      batchNo: productBatches.batchNo,
      expiryDate: productBatches.expiryDate,
      mfgDate: productBatches.mfgDate,
      costPrice: productBatches.costPrice,
      currentStock: dSql<number>`coalesce(sum(${stockLedger.delta}), 0)::int`,
    })
    .from(productBatches)
    .leftJoin(stockLedger, eq(productBatches.id, stockLedger.batchId))
    .where(eq(productBatches.productId, productId))
    .groupBy(productBatches.id);

  let totalStock = 0;
  let sellableStock = 0;
  let expiringIn90DaysStock = 0;

  const in90DaysCutoff = new Date();
  in90DaysCutoff.setDate(in90DaysCutoff.getDate() + 90);

  for (const b of batches) {
    const stock = Number(b.currentStock) || 0;
    if (stock <= 0) continue;

    totalStock += stock;
    if (new Date(b.expiryDate) > cutoff) {
      sellableStock += stock;
    }
    if (new Date(b.expiryDate) <= in90DaysCutoff) {
      expiringIn90DaysStock += stock;
    }
  }

  return {
    productId,
    totalStock,
    sellableStock,
    expiringIn90DaysStock,
    batches: batches.filter((b) => Number(b.currentStock) > 0),
  };
}

/**
 * Allocate stock using FEFO (First-Expiring-First-Out) rule (§5.3).
 * Batches with earliest expiry are chosen first, provided expiry > now() + 60 days.
 */
export function allocateFEFO(
  batches: Array<{ batchId: string; batchNo: string; expiryDate: Date; availableStock: number }>,
  requiredQty: number,
  now: Date = new Date()
): { allocations: BatchAllocation[]; unfulfilledQty: number } {
  if (requiredQty <= 0) {
    return { allocations: [], unfulfilledQty: 0 };
  }

  const cutoff = sellableExpiryCutoff(now);

  // Filter batches expiring in >60 days and sort by expiry date ASC (FEFO)
  const sorted = [...batches]
    .filter((b) => new Date(b.expiryDate) > cutoff && b.availableStock > 0)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const allocations: BatchAllocation[] = [];
  let remaining = requiredQty;

  for (const b of sorted) {
    if (remaining <= 0) break;

    const toTake = Math.min(b.availableStock, remaining);
    if (toTake > 0) {
      allocations.push({
        batchId: b.batchId,
        batchNo: b.batchNo,
        expiryDate: b.expiryDate,
        qtyAllocated: toTake,
      });
      remaining -= toTake;
    }
  }

  return {
    allocations,
    unfulfilledQty: remaining,
  };
}

/**
 * Number of days before expiry at which a batch stops being sellable (§5.3).
 */
export const EXPIRY_BLOCK_DAYS = 60;

/** The cutoff a batch's expiry must be later than to be sellable. */
export function sellableExpiryCutoff(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + EXPIRY_BLOCK_DAYS);
  return cutoff;
}

/**
 * Lock a product's sellable batches and allocate against them, inside a caller
 * supplied transaction.
 *
 * This is the allocation that must gate an order. `getProductStockSummary` +
 * `allocateFEFO` read committed state with no lock, so two checkouts racing for
 * the last unit both saw it available and both wrote a `-1` ledger row — §20
 * promises "negative stock: impossible by construction", and without
 * `SELECT … FOR UPDATE` in the order's own transaction it was merely unlikely.
 *
 * `FOR UPDATE` on `product_batches` serialises concurrent orders for the same
 * product: the second waits, then re-reads the ledger and sees the first one's
 * deduction.
 */
export async function lockAndAllocateFEFO(
  tx: any,
  productId: string,
  requiredQty: number,
  now: Date = new Date()
): Promise<{ allocations: BatchAllocation[]; unfulfilledQty: number }> {
  if (requiredQty <= 0) return { allocations: [], unfulfilledQty: 0 };

  const cutoff = sellableExpiryCutoff(now);

  // Lock the candidate batch rows. FEFO order, so lock acquisition order is
  // consistent across concurrent transactions and cannot deadlock on itself.
  const locked = await tx
    .select({
      batchId: productBatches.id,
      batchNo: productBatches.batchNo,
      expiryDate: productBatches.expiryDate,
    })
    .from(productBatches)
    .where(and(eq(productBatches.productId, productId), gt(productBatches.expiryDate, cutoff)))
    .orderBy(asc(productBatches.expiryDate))
    .for('update');

  if (locked.length === 0) return { allocations: [], unfulfilledQty: requiredQty };

  const batchIds = locked.map((b: { batchId: string }) => b.batchId);

  // Derived stock, read after the lock so it cannot be stale (§2 rule 3).
  const stockRows = await tx
    .select({
      batchId: stockLedger.batchId,
      total: dSql<number>`coalesce(sum(${stockLedger.delta}), 0)::int`,
    })
    .from(stockLedger)
    .where(inArray(stockLedger.batchId, batchIds))
    .groupBy(stockLedger.batchId);

  const stockByBatch = new Map<string, number>();
  for (const row of stockRows as Array<{ batchId: string; total: number }>) {
    stockByBatch.set(row.batchId, Number(row.total) || 0);
  }

  return allocateFEFO(
    locked.map((b: { batchId: string; batchNo: string; expiryDate: Date }) => ({
      batchId: b.batchId,
      batchNo: b.batchNo,
      expiryDate: new Date(b.expiryDate),
      availableStock: Math.max(0, stockByBatch.get(b.batchId) ?? 0),
    })),
    requiredQty,
    now
  );
}
