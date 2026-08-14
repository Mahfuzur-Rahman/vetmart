// lib/services/__tests__/stock.test.ts
import { describe, it, expect } from 'vitest';
import { allocateFEFO } from '../stock';

describe('FEFO Stock Allocation (§5.3)', () => {
  const now = new Date();

  // Create test dates
  const future90Days = new Date(now);
  future90Days.setDate(future90Days.getDate() + 90);

  const future180Days = new Date(now);
  future180Days.setDate(future180Days.getDate() + 180);

  const future360Days = new Date(now);
  future360Days.setDate(future360Days.getDate() + 360);

  const expiringSoon40Days = new Date(now);
  expiringSoon40Days.setDate(expiringSoon40Days.getDate() + 40); // < 60 days cutoff

  it('allocates from earliest expiring batch first', () => {
    const batches = [
      { batchId: 'b-180', batchNo: 'BATCH-180', expiryDate: future180Days, availableStock: 10 },
      { batchId: 'b-90', batchNo: 'BATCH-90', expiryDate: future90Days, availableStock: 5 },
      { batchId: 'b-360', batchNo: 'BATCH-360', expiryDate: future360Days, availableStock: 20 },
    ];

    const result = allocateFEFO(batches, 8);

    // Should take 5 from b-90 (earliest) and 3 from b-180
    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0].batchId).toBe('b-90');
    expect(result.allocations[0].qtyAllocated).toBe(5);

    expect(result.allocations[1].batchId).toBe('b-180');
    expect(result.allocations[1].qtyAllocated).toBe(3);

    expect(result.unfulfilledQty).toBe(0);
  });

  it('strictly excludes batches expiring in <= 60 days from sellable stock (§5.3)', () => {
    const batches = [
      { batchId: 'b-expired-soon', batchNo: 'BATCH-OLD', expiryDate: expiringSoon40Days, availableStock: 100 },
      { batchId: 'b-valid', batchNo: 'BATCH-NEW', expiryDate: future90Days, availableStock: 5 },
    ];

    const result = allocateFEFO(batches, 10);

    // Only 5 available from valid batch; remaining 5 cannot be fulfilled from the expiring batch
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].batchId).toBe('b-valid');
    expect(result.allocations[0].qtyAllocated).toBe(5);
    expect(result.unfulfilledQty).toBe(5);
  });

  it('handles zero and negative requested quantities gracefully', () => {
    const batches = [
      { batchId: 'b-1', batchNo: 'B1', expiryDate: future90Days, availableStock: 10 },
    ];

    expect(allocateFEFO(batches, 0)).toEqual({ allocations: [], unfulfilledQty: 0 });
    expect(allocateFEFO(batches, -5)).toEqual({ allocations: [], unfulfilledQty: 0 });
  });
});
