// lib/services/__tests__/pricing.test.ts
import { describe, it, expect } from 'vitest';
import { calculateLineTotal, calculateVat, calculateOrderTotals } from '../pricing';

describe('Pricing Service (§2 rule 5)', () => {
  it('calculates line item total in integer paisa correctly', () => {
    // 3 units at ৳150.50 (15050 paisa) = 45150 paisa
    expect(calculateLineTotal(3, 15050)).toBe(45150);
  });

  it('calculates VAT correctly rounded to nearest paisa', () => {
    // 5% VAT on ৳100.00 (10000 paisa) = 500 paisa
    expect(calculateVat(10000, 5)).toBe(500);

    // 15% VAT on ৳15.30 (1530 paisa) = 229.5 -> 230 paisa
    expect(calculateVat(1530, 15)).toBe(230);

    // 0% VAT
    expect(calculateVat(10000, 0)).toBe(0);
  });

  it('calculates complete order totals with shipping and discount', () => {
    const items = [
      { qty: 2, unitPrice: 50000, vatRatePercent: 5 }, // subtotal: 100,000, VAT: 5,000
      { qty: 1, unitPrice: 25000, vatRatePercent: 0 }, // subtotal: 25,000, VAT: 0
    ];

    const result = calculateOrderTotals({
      items,
      shippingFeePaisa: 8000, // ৳80.00
      discountPaisa: 5000, // ৳50.00
    });

    // Subtotal: 125,000 (৳1,250.00)
    // VAT: 5,000 (৳50.00)
    // Discount: 5,000 (৳50.00)
    // Shipping: 8,000 (৳80.00)
    // Total = 125000 - 5000 + 5000 + 8000 = 133000 (৳1,330.00)
    expect(result.subtotal).toBe(125000);
    expect(result.vat).toBe(5000);
    expect(result.discount).toBe(5000);
    expect(result.shipping).toBe(8000);
    expect(result.total).toBe(133000);
  });

  it('caps discount at subtotal to prevent negative totals', () => {
    const items = [{ qty: 1, unitPrice: 1000 }];
    const result = calculateOrderTotals({
      items,
      discountPaisa: 5000, // discount larger than subtotal
      shippingFeePaisa: 500,
    });

    expect(result.discount).toBe(1000);
    expect(result.total).toBe(500); // 1000 - 1000 + 0 + 500 = 500
  });
});
