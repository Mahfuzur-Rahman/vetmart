// tests/orders-are-server-state.test.ts
//
// Orders, abandoned-cart leads and reviews all used to be written to the
// browser's localStorage and read back from it, so they were device-local: an
// order placed on a customer's phone was invisible to the admin, and a lead
// captured on that phone was invisible to the operator meant to call back.
//
// These tests assert those stores are gone and stay gone.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { BOARD_TO_DB_STATUS, DB_TO_BOARD_STATUS } from '@/lib/services/order-status';
import * as leadsModule from '@/lib/mock-data/incomplete-orders';

const ROOT = path.resolve(__dirname, '..');

function readSource(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

/**
 * Source with comments removed.
 *
 * The comments in these files deliberately name the retired storage keys to
 * explain why they are gone, so a raw text match would flag the explanation
 * rather than a regression.
 */
function readCode(relPath: string): string {
  return readSource(relPath)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** Every surface that used to read or write order/lead/review data locally. */
const ORDER_SURFACES = [
  'components/storefront/CheckoutForm.tsx',
  'components/storefront/ExpressOrderView.tsx',
  'components/storefront/ProductReviewsSection.tsx',
  'components/admin/AdminOrdersBoard.tsx',
  'components/admin/AdminIncompleteOrdersBoard.tsx',
];

/** localStorage keys these surfaces used to read and write. */
const RETIRED_KEYS = [
  'vetmart_mock_orders',
  'vetmart_incomplete_orders_v1',
  'vetmart_reviews_',
];

describe('order, lead and review data is server state', () => {
  it.each(ORDER_SURFACES)('%s writes none of the retired localStorage keys', (relPath) => {
    const src = readCode(relPath);
    for (const key of RETIRED_KEYS) {
      expect(src, `${relPath} still references ${key}`).not.toContain(`'${key}`);
      expect(src, `${relPath} still references ${key}`).not.toContain(`\`${key}`);
    }
  });

  it.each(ORDER_SURFACES)('%s does not call localStorage at all', (relPath) => {
    const src = readCode(relPath);
    const calls = src.match(/localStorage\s*\.\s*(get|set|remove)Item/g) ?? [];
    expect(calls, `${relPath} still calls localStorage`).toEqual([]);
  });

  it('no longer exports the browser-side lead store', () => {
    expect(leadsModule).not.toHaveProperty('getStoredIncompleteOrders');
    expect(leadsModule).not.toHaveProperty('saveStoredIncompleteOrders');
    expect(leadsModule).not.toHaveProperty('INCOMPLETE_ORDERS_STORAGE_KEY');
  });

  it('keeps the guest cart in the browser, which is the one correct case', () => {
    // A guest's cart legitimately belongs to their device until checkout posts
    // it to the server. This is the deliberate exception, not an oversight.
    const src = readSource('lib/context/CartContext.tsx');
    expect(src).toContain('vetmart_cart_v1');
  });
});

describe('order status mapping', () => {
  it('round-trips every board status back to itself', () => {
    // The board's vocabulary is coarser than the database enum. A status the
    // board sets must map back to the same board status when re-read, or an
    // order would appear to jump columns after a refresh.
    for (const boardStatus of Object.keys(BOARD_TO_DB_STATUS) as Array<
      keyof typeof BOARD_TO_DB_STATUS
    >) {
      const dbStatus = BOARD_TO_DB_STATUS[boardStatus];
      expect(DB_TO_BOARD_STATUS[dbStatus], `${boardStatus} -> ${dbStatus} -> ?`).toBe(boardStatus);
    }
  });

  it('maps every database status to a board status', () => {
    const DB_STATUSES = [
      'placed',
      'awaiting_rx_review',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'returned',
    ];
    for (const status of DB_STATUSES) {
      expect(DB_TO_BOARD_STATUS[status], `${status} has no board mapping`).toBeDefined();
    }
  });
});

describe('guest express orders', () => {
  it('requires an Idempotency-Key on the route (§9)', () => {
    // BD mobile data drops mid-request constantly; without this a retry creates
    // a duplicate order and a duplicate courier consignment.
    const src = readSource('app/api/v1/orders/express/route.ts');
    expect(src).toContain('idempotency-key');
    expect(src).toContain('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('is enforced by a unique index, not just by the route', () => {
    const schema = readSource('lib/db/schema/orders.ts');
    expect(schema).toContain("uniqueIndex('orders_idempotency_key_idx')");
  });

  it('never trusts a client-supplied price', () => {
    // Prices are re-read from the products table inside placeGuestOrder.
    const src = readSource('lib/services/checkout.ts');
    expect(src).toContain('unitPrice: product.salePrice');
  });

  it('refuses prescription-only products on the guest path (§5.5)', () => {
    const src = readSource('lib/services/checkout.ts');
    expect(src).toContain('PRESCRIPTION_REQUIRED');
  });

  it('writes a stock ledger movement rather than mutating a stock column (§2 rule 3)', () => {
    const src = readSource('lib/services/checkout.ts');
    expect(src).toContain("reason: 'sale'");
    expect(src).not.toMatch(/UPDATE\s+products\s+SET\s+stock/i);
  });
});

describe('admin API routes are authenticated', () => {
  // These were completely unauthenticated: on a public deployment anyone who
  // knew the URL could mutate the catalog or read customer PII.
  const GUARDED_ROUTES: Array<[string, string]> = [
    ['app/api/v1/admin/products/route.ts', 'product.write'],
    ['app/api/v1/admin/products/[id]/route.ts', 'product.write'],
    ['app/api/v1/admin/upload/route.ts', 'product.write'],
    ['app/api/v1/admin/orders/route.ts', 'order.read'],
    ['app/api/v1/admin/orders/[orderId]/notes/route.ts', 'order.write'],
    ['app/api/v1/admin/incomplete-orders/route.ts', 'order.read'],
    ['app/api/v1/admin/incomplete-orders/[id]/route.ts', 'order.write'],
  ];

  it.each(GUARDED_ROUTES)('%s requires %s', (relPath, permission) => {
    const src = readSource(relPath);
    expect(src).toContain(`requireAdmin('${permission}')`);
  });
});
