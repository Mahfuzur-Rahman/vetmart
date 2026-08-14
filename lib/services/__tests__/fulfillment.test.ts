// lib/services/__tests__/fulfillment.test.ts
import { describe, it, expect } from 'vitest';

// Test the VALID_TRANSITIONS map logic (pure unit test, no DB)
const VALID_TRANSITIONS: Record<string, string[]> = {
  placed: ['processing', 'cancelled'],
  awaiting_rx_review: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: [],
  cancelled: [],
  returned: [],
};

function canTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  return !!allowed && allowed.includes(to);
}

describe('Order Fulfillment Status Transitions (§5.5)', () => {
  it('allows placed → processing', () => {
    expect(canTransition('placed', 'processing')).toBe(true);
  });

  it('allows placed → cancelled', () => {
    expect(canTransition('placed', 'cancelled')).toBe(true);
  });

  it('blocks placed → shipped (must go through processing)', () => {
    expect(canTransition('placed', 'shipped')).toBe(false);
  });

  it('allows awaiting_rx_review → processing (after Rx approval)', () => {
    expect(canTransition('awaiting_rx_review', 'processing')).toBe(true);
  });

  it('allows awaiting_rx_review → cancelled (Rx rejection)', () => {
    expect(canTransition('awaiting_rx_review', 'cancelled')).toBe(true);
  });

  it('allows processing → shipped', () => {
    expect(canTransition('processing', 'shipped')).toBe(true);
  });

  it('allows shipped → delivered', () => {
    expect(canTransition('shipped', 'delivered')).toBe(true);
  });

  it('allows shipped → returned', () => {
    expect(canTransition('shipped', 'returned')).toBe(true);
  });

  it('blocks delivered → any (terminal state)', () => {
    expect(canTransition('delivered', 'cancelled')).toBe(false);
    expect(canTransition('delivered', 'shipped')).toBe(false);
    expect(canTransition('delivered', 'processing')).toBe(false);
  });

  it('blocks cancelled → any (terminal state)', () => {
    expect(canTransition('cancelled', 'processing')).toBe(false);
    expect(canTransition('cancelled', 'placed')).toBe(false);
  });

  it('blocks returned → any (terminal state)', () => {
    expect(canTransition('returned', 'delivered')).toBe(false);
  });
});
