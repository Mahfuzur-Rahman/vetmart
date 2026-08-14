// lib/services/pricing.ts
// Financial calculations in integer paisa (§2 rule 5, §13)

export interface PricingItem {
  qty: number;
  unitPrice: number; // in integer paisa
  vatRatePercent?: number; // e.g. 0, 5, 15
}

export interface OrderPricingSummary {
  subtotal: number; // in integer paisa
  vat: number; // in integer paisa
  discount: number; // in integer paisa
  shipping: number; // in integer paisa
  total: number; // in integer paisa
}

/**
 * Calculate line item total in integer paisa.
 */
export function calculateLineTotal(qty: number, unitPrice: number): number {
  if (qty < 0 || unitPrice < 0) {
    throw new Error('Quantity and price must be non-negative.');
  }
  return Math.round(qty * unitPrice);
}

/**
 * Calculate VAT for an amount given a percentage rate (e.g. 5 for 5%).
 * Rounds to nearest paisa.
 */
export function calculateVat(taxableAmountPaisa: number, vatRatePercent: number = 0): number {
  if (vatRatePercent <= 0 || taxableAmountPaisa <= 0) return 0;
  return Math.round((taxableAmountPaisa * vatRatePercent) / 100);
}

/**
 * Calculate complete order totals with integer paisa precision.
 */
export function calculateOrderTotals(params: {
  items: PricingItem[];
  shippingFeePaisa?: number;
  discountPaisa?: number;
}): OrderPricingSummary {
  let subtotal = 0;
  let totalVat = 0;

  for (const item of params.items) {
    const lineTotal = calculateLineTotal(item.qty, item.unitPrice);
    subtotal += lineTotal;
    totalVat += calculateVat(lineTotal, item.vatRatePercent ?? 0);
  }

  const shipping = Math.max(0, params.shippingFeePaisa ?? 0);
  const discount = Math.min(subtotal, Math.max(0, params.discountPaisa ?? 0));
  const total = Math.max(0, subtotal - discount + totalVat + shipping);

  return {
    subtotal,
    vat: totalVat,
    discount,
    shipping,
    total,
  };
}
