// tests/order-processing-and-dispatch-fixes.test.ts
import { describe, it, expect } from 'vitest';
import { DB_TO_BOARD_STATUS, BOARD_TO_DB_STATUS } from '@/lib/services/order-status';

// Operational transitions configuration
const VALID_TRANSITIONS: Record<string, string[]> = {
  placed: ['confirmed', 'processing', 'cancelled'],
  awaiting_rx_review: ['processing', 'cancelled', 'confirmed'],
  confirmed: ['processing', 'shipped', 'cancelled', 'placed'],
  processing: ['shipped', 'delivered', 'cancelled', 'confirmed'],
  shipped: ['delivered', 'returned', 'cancelled'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

function canTransition(from: string, to: string): boolean {
  if (from === to) return true; // Idempotent
  const allowed = VALID_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

describe('Order Status Vocabulary & Mapping Integrity', () => {
  it('correctly maps granular DB statuses to board statuses without losing confirmed/processing', () => {
    expect(DB_TO_BOARD_STATUS['placed']).toBe('pending');
    expect(DB_TO_BOARD_STATUS['confirmed']).toBe('confirmed');
    expect(DB_TO_BOARD_STATUS['processing']).toBe('processing');
    expect(DB_TO_BOARD_STATUS['shipped']).toBe('dispatched');
    expect(DB_TO_BOARD_STATUS['delivered']).toBe('delivered');
    expect(DB_TO_BOARD_STATUS['cancelled']).toBe('cancelled');
    expect(DB_TO_BOARD_STATUS['returned']).toBe('cancelled');
  });

  it('correctly maps board statuses back to the authoritative DB statuses', () => {
    expect(BOARD_TO_DB_STATUS['pending']).toBe('placed');
    expect(BOARD_TO_DB_STATUS['confirmed']).toBe('confirmed');
    expect(BOARD_TO_DB_STATUS['processing']).toBe('processing');
    expect(BOARD_TO_DB_STATUS['dispatched']).toBe('shipped');
    expect(BOARD_TO_DB_STATUS['delivered']).toBe('delivered');
    expect(BOARD_TO_DB_STATUS['cancelled']).toBe('cancelled');
  });

  it('supports the full e-commerce lifecycle transitions', () => {
    // Standard phone confirmation flow
    expect(canTransition('placed', 'confirmed')).toBe(true);
    expect(canTransition('confirmed', 'processing')).toBe(true);
    expect(canTransition('processing', 'shipped')).toBe(true);
    expect(canTransition('shipped', 'delivered')).toBe(true);

    // Direct local delivery / customer pickup from processing
    expect(canTransition('processing', 'delivered')).toBe(true);

    // Idempotent transitions are safe
    expect(canTransition('confirmed', 'confirmed')).toBe(true);
    expect(canTransition('processing', 'processing')).toBe(true);

    // Cancellation flows
    expect(canTransition('placed', 'cancelled')).toBe(true);
    expect(canTransition('confirmed', 'cancelled')).toBe(true);
    expect(canTransition('processing', 'cancelled')).toBe(true);

    // Terminal guards
    expect(canTransition('cancelled', 'processing')).toBe(false);
    expect(canTransition('cancelled', 'placed')).toBe(false);
  });
});
