// tests/application-audit-fixes.test.ts
// Regression guards for the application-wide audit.
//
// Each case names the flow it protects and, where the bug was a missing control,
// asserts on the source so the control cannot quietly disappear again.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { and, eq, gt, asc, inArray, sql as dSql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productBatches, stockLedger, orders, orderItems } from '@/lib/db/schema';
import { allocateFEFO, sellableExpiryCutoff, EXPIRY_BLOCK_DAYS } from '@/lib/services/stock';

const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');

describe('authorization coverage on admin and courier endpoints (§14.1)', () => {
  const GUARDED: Array<[string, string]> = [
    ['app/api/v1/admin/categories/route.ts', 'category'],
    ['app/api/v1/admin/species/route.ts', 'category'],
    ['app/api/v1/admin/drug-classifications/route.ts', 'category'],
    ['app/api/v1/courier/dispatch-bulk/route.ts', 'order'],
    ['app/api/v1/courier/fraud-check/route.ts', 'order'],
  ];

  it.each(GUARDED)('%s requires an authenticated admin', (rel) => {
    const src = read(rel);
    expect(src).toContain("from '@/lib/api/guard'");
    expect(src).toContain('requireAdmin(');
  });

  it('gates every exported handler in those files, not just one', () => {
    for (const [rel] of GUARDED) {
      const src = read(rel);
      const handlerCount = (src.match(/export async function (GET|POST|PUT|PATCH|DELETE)/g) || []).length;
      const guardCount = (src.match(/requireAdmin\(/g) || []).length;
      expect(guardCount, `${rel} has ${handlerCount} handlers but ${guardCount} guards`).toBeGreaterThanOrEqual(
        handlerCount
      );
    }
  });
});

describe('courier status webhook authentication (§12 rule 2)', () => {
  const PATHS = [
    'app/api/webhooks/courier/steadfast/route.ts',
    'app/api/v1/webhook/steadfast/route.ts',
  ];

  it.each(PATHS)('%s authenticates before acting', (rel) => {
    const src = read(rel);
    expect(src).toContain('authenticateCourierWebhook(req)');
    // The auth check must come before the payload is applied.
    expect(src.indexOf('authenticateCourierWebhook')).toBeLessThan(
      src.indexOf('handleCourierWebhookPayload')
    );
  });

  it('no longer contains the empty signature-check block', () => {
    for (const rel of PATHS) {
      expect(read(rel)).not.toContain('Valid signature check if needed');
    }
  });

  it('compares the secret in constant time', () => {
    const src = read('lib/courier/webhook.ts');
    expect(src).toContain('timingSafeEqual');
  });
});

describe('signing secrets (§4.3 fail-fast)', () => {
  it('names the dev defaults so the guard can reject them', () => {
    const src = read('lib/env.ts');
    expect(src).toContain('DEV_AUTH_SECRET');
    expect(src).toContain('DEV_JWT_SECRET');
  });

  it('checks both length and default-value reuse when deployed', () => {
    const src = read('lib/env.ts');
    expect(src).toContain("data.NODE_ENV === 'production' || data.VERCEL === '1'");
    expect(src).toContain('value.length < 32');
  });

  it('keys the OTP hash with the server secret, not the phone number', () => {
    const src = read('lib/auth/hash.ts');
    // The phone lives in the same otp_requests row, so keying on it protected
    // nothing against a database dump.
    expect(src).not.toContain("createHmac('sha256', phone)");
    expect(src).toContain('env.JWT_SECRET');
    expect(src).toContain('otp:${phone}:${code.trim()}');
  });
});

describe('rate limiting cannot be side-stepped with a header', () => {
  it('reads the proxy-written end of X-Forwarded-For', () => {
    const src = read('lib/api/client-ip.ts');
    expect(src).toContain('hops[hops.length - 1]');
    expect(src).toContain('x-vercel-forwarded-for');
  });

  const CALLERS = [
    'app/api/v1/auth/otp/request/route.ts',
    'app/api/v1/auth/otp/verify/route.ts',
    'app/api/v1/admin/auth/login/route.ts',
  ];

  it.each(CALLERS)('%s uses getClientIp rather than the raw header', (rel) => {
    const src = read(rel);
    expect(src).toContain('getClientIp(req)');
    expect(src).not.toMatch(/headers\.get\('x-forwarded-for'\)/);
  });

  it('limits OTP requests per phone as well as per IP (§8)', () => {
    const src = read('app/api/v1/auth/otp/request/route.ts');
    expect(src).toContain('otp-request:ip:');
    expect(src).toContain('otp-request:phone:');
  });

  it('limits OTP verification attempts', () => {
    const src = read('app/api/v1/auth/otp/verify/route.ts');
    expect(src).toContain('otp-verify:phone:');
  });

  it('degrades open, with a log, when the limiter itself is down', () => {
    const src = read('lib/auth/rate-limit.ts');
    expect(src).toContain('export async function rateLimitOrAllow');
  });
});

describe('order numbering (§11)', () => {
  it('draws from a Postgres sequence instead of Math.random', () => {
    const src = read('lib/services/checkout.ts');
    // 9000 random values a month into a UNIQUE column collided at ~55%
    // probability by 120 orders, and a collision failed the checkout.
    expect(src).not.toContain('Math.floor(1000 + Math.random() * 9000)');
    expect(src).toContain("nextval('order_no_seq')");
    expect(src).toContain("nextval('invoice_no_seq')");
  });

  it('ships the sequences as a registered migration', () => {
    const sql = read('lib/db/migrations/0004_order_number_sequences.sql');
    expect(sql).toContain('CREATE SEQUENCE IF NOT EXISTS order_no_seq');
    expect(sql).toContain('CREATE SEQUENCE IF NOT EXISTS invoice_no_seq');

    const journal = JSON.parse(read('lib/db/migrations/meta/_journal.json'));
    expect(journal.entries.some((e: { tag: string }) => e.tag === '0004_order_number_sequences')).toBe(
      true
    );
  });

  it('starts the sequences above any pre-existing random number', () => {
    // Orders placed before 0004 carry a random four-digit suffix. A sequence
    // starting at 1 would eventually reach one of them inside the same YYMM
    // prefix and fail the insert — the original bug, just delayed.
    const sql = read('lib/db/migrations/0005_seed_order_number_sequences.sql');
    expect(sql).toContain('setval(');
    expect(sql).toContain("'order_no_seq'");
    expect(sql).toContain("'invoice_no_seq'");
    expect(sql).toContain('regexp_match(order_no');
    expect(sql).toContain('regexp_match(invoice_no');
    // No-op on a fresh database rather than an error.
    expect(sql).toContain('COALESCE(');
    // Both calls pass is_called = false, so the seeded value is the next one
    // handed out rather than one already consumed.
    expect((sql.match(/\bfalse\b/g) || []).length).toBe(2);

    const journal = JSON.parse(read('lib/db/migrations/meta/_journal.json'));
    expect(
      journal.entries.some((e: { tag: string }) => e.tag === '0005_seed_order_number_sequences')
    ).toBe(true);
  });

  it('keeps the migration journal indices contiguous and ordered', () => {
    const journal = JSON.parse(read('lib/db/migrations/meta/_journal.json'));
    const idxs = journal.entries.map((e: { idx: number }) => e.idx);
    expect(idxs).toEqual(idxs.map((_: number, i: number) => i));
  });

  it('builds the YYMM part in Dhaka time (§6)', () => {
    const src = read('lib/services/checkout.ts');
    expect(src).toContain('dhakaYearMonth');
  });
});

describe('stock allocation is locked (§20 "negative stock: impossible by construction")', () => {
  it('exposes a locking allocator that takes a transaction', () => {
    const src = read('lib/services/stock.ts');
    expect(src).toContain('export async function lockAndAllocateFEFO');
    expect(src).toContain(".for('update')");
  });

  it('is the allocator both order paths commit against', () => {
    const src = read('lib/services/checkout.ts');
    const calls = (src.match(/lockAndAllocateFEFO\(tx,/g) || []).length;
    expect(calls).toBe(2); // placeOrder + placeGuestOrder
  });

  it('aborts the order when the locked allocation comes up short', () => {
    const src = read('lib/services/checkout.ts');
    expect(src).toContain('InsufficientStockError');
    expect(src).toContain('GuestInsufficientStockError');
  });

  it('applies the 60-day expiry block from a single shared cutoff (§5.3)', () => {
    expect(EXPIRY_BLOCK_DAYS).toBe(60);
    const now = new Date('2026-01-01T00:00:00Z');
    const cutoff = sellableExpiryCutoff(now);
    expect(cutoff.getTime()).toBe(new Date('2026-03-02T00:00:00Z').getTime());
  });

  it('refuses a batch inside the expiry block even when stock exists', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const result = allocateFEFO(
      [
        {
          batchId: 'near-expiry',
          batchNo: 'B-1',
          expiryDate: new Date('2026-02-01T00:00:00Z'), // 31 days out
          availableStock: 100,
        },
      ],
      5,
      now
    );
    expect(result.allocations).toHaveLength(0);
    expect(result.unfulfilledQty).toBe(5);
  });

  it('takes the earliest sellable batch first (FEFO)', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const result = allocateFEFO(
      [
        { batchId: 'late', batchNo: 'B-late', expiryDate: new Date('2027-01-01T00:00:00Z'), availableStock: 10 },
        { batchId: 'early', batchNo: 'B-early', expiryDate: new Date('2026-06-01T00:00:00Z'), availableStock: 4 },
      ],
      6,
      now
    );
    expect(result.allocations.map((a) => a.batchId)).toEqual(['early', 'late']);
    expect(result.allocations[0].qtyAllocated).toBe(4);
    expect(result.allocations[1].qtyAllocated).toBe(2);
    expect(result.unfulfilledQty).toBe(0);
  });
});

describe('checkout integrity', () => {
  const src = read('lib/services/checkout.ts');

  it('scopes the delivery address to the buyer', () => {
    // Looking it up by id alone let any logged-in customer ship to — and read
    // the snapshot of — another customer's saved address.
    expect(src).toContain('eq(addresses.userId, input.userId)');
  });

  it('requires an Idempotency-Key on the authenticated checkout too (§9)', () => {
    const route = read('app/api/v1/checkout/route.ts');
    expect(route).toContain('IDEMPOTENCY_KEY_REQUIRED');
    expect(src).toContain('idempotencyKey: input.idempotencyKey ?? null');
  });

  it('fails cold-chain checks closed when a district has no zone row (§5.4)', () => {
    expect(src).not.toContain('hasColdChain && deliveryQuote && !deliveryQuote.coldChainEnabled');
    const closedChecks = (src.match(/hasColdChain && !deliveryQuote\?\.coldChainEnabled/g) || []).length;
    expect(closedChecks).toBe(2); // both order paths
  });

  it('snapshots withdrawal periods on every order line (§11)', () => {
    const snapshots = (src.match(/withdrawalMeatDays: (item\.product|product)\.withdrawalMeatDays/g) || [])
      .length;
    expect(snapshots).toBe(2);
    expect(read('lib/services/cart.ts')).toContain('withdrawalMeatDays: products.withdrawalMeatDays');
  });

  it('routes a cold-chain order away from the standard courier (§12 rule 5)', () => {
    expect(src).toContain("fulfilmentChannel: hasColdChain ? 'cold_chain' : 'steadfast'");
  });

  it('clears the cart inside the order transaction', () => {
    expect(src).toContain('tx.delete(cartItems)');
  });
});

describe('order lifecycle', () => {
  const src = read('lib/services/fulfillment.ts');

  it('returns allocated stock to the ledger on cancel and return (§2 rule 3)', () => {
    expect(src).toContain('STOCK_RELEASING_STATUSES');
    expect(src).toContain('releaseOrderStock');
    // A correction is a new positive row, never an edit of the sale row.
    expect(src).toContain('delta: line.qty');
  });

  it('makes the restock idempotent against a repeated courier callback', () => {
    expect(src).toContain('RESTOCK_REF_TYPE');
    expect(src).toContain('if ((already?.count ?? 0) > 0) return;');
  });

  it('stamps confirmedAt and cancelledAt', () => {
    expect(src).toContain('patch.confirmedAt');
    expect(src).toContain('patch.cancelledAt');
  });

  it('locks the order row so two transitions cannot both release stock', () => {
    expect(src).toContain(".for('update')");
  });

  it('has the webhook go through transitionOrderStatus, not a bare UPDATE', () => {
    const webhookSection = src.slice(src.indexOf('export async function processSteadfastWebhook'));
    expect(webhookSection).toContain('await transitionOrderStatus(shipment.orderId, targetOrderStatus');
    expect(webhookSection).not.toContain('.update(orders)');
  });

  it('refuses to hand a non-steadfast order to the standard courier', () => {
    expect(src).toContain("order.fulfilmentChannel !== 'steadfast'");
  });

  it('keeps drug names out of the courier item description (§12 rule 4)', () => {
    expect(src).toContain('Animal health supplies');
  });
});

describe('uploads (§10)', () => {
  const src = read('app/api/v1/admin/upload/route.ts');

  it('rejects SVG', () => {
    // Served from the app origin, an SVG upload is stored XSS.
    expect(src).not.toContain("'image/svg+xml'");
  });

  it('verifies magic bytes rather than the declared Content-Type', () => {
    expect(src).toContain('sniffImageMime');
    expect(src).toContain('INVALID_IMAGE_CONTENT');
    expect(src).toContain('contentType: actualMime');
  });
});

describe('review trust badges are earned, not submitted', () => {
  const src = read('lib/services/reviews.ts');

  it('does not hardcode isVerifiedPurchase', () => {
    expect(src).not.toContain('isVerifiedPurchase: true,');
    expect(src).toContain('isVerifiedPurchase: isVerifiedPurchase');
  });

  it('derives the purchase badge from a delivered order for that product', () => {
    expect(src).toContain('.from(orderItems)');
    expect(src).toContain("inArray(orders.status, ['delivered'])");
  });

  it('takes the vet badge from the user record, not the payload', () => {
    expect(src).not.toContain('isVetRecommended: data.isVetRecommended ?? false');
    expect(src).toContain('users.isVerifiedVet');
  });
});

describe('the row locks reach Postgres, not just the query builder', () => {
  // Asserting that the source calls `.for('update')` proves nothing about what
  // the database receives — and a lock clause silently dropped (or combined
  // with an aggregate, which Postgres rejects) is exactly the failure that
  // brings the negative-stock race back. Compile the queries and read the SQL.
  // `toSQL()` needs no connection.

  it('emits FOR UPDATE when locking the batches for a product', () => {
    const { sql } = db
      .select({
        batchId: productBatches.id,
        batchNo: productBatches.batchNo,
        expiryDate: productBatches.expiryDate,
      })
      .from(productBatches)
      .where(
        and(
          eq(productBatches.productId, 'P'),
          gt(productBatches.expiryDate, new Date('2026-03-02T00:00:00Z'))
        )
      )
      .orderBy(asc(productBatches.expiryDate))
      .for('update')
      .toSQL();

    expect(sql.toLowerCase()).toContain('for update');
    // FEFO ordering must survive into the SQL, or the lock order differs
    // between concurrent transactions and they can deadlock on each other.
    expect(sql.toLowerCase()).toContain('order by');
    // Postgres rejects FOR UPDATE alongside grouping/aggregation.
    expect(sql.toLowerCase()).not.toContain('group by');
  });

  it('emits FOR UPDATE when locking the order row for a transition', () => {
    const { sql } = db.select().from(orders).where(eq(orders.id, 'O')).limit(1).for('update').toSQL();
    expect(sql.toLowerCase()).toContain('for update');
  });

  it('reads derived batch stock as a grouped sum with no lock clause', () => {
    // This one runs after the lock is held, so it must NOT carry FOR UPDATE —
    // Postgres errors on FOR UPDATE with GROUP BY.
    const { sql } = db
      .select({
        batchId: stockLedger.batchId,
        total: dSql<number>`coalesce(sum(${stockLedger.delta}), 0)::int`,
      })
      .from(stockLedger)
      .where(inArray(stockLedger.batchId, ['B1', 'B2']))
      .groupBy(stockLedger.batchId)
      .toSQL();

    expect(sql.toLowerCase()).toContain('group by');
    expect(sql.toLowerCase()).not.toContain('for update');
  });

  it('probes for a prior stock reversal by ref_type and ref_id', () => {
    const { sql, params } = db
      .select({ count: dSql<number>`count(*)::int` })
      .from(stockLedger)
      .where(and(eq(stockLedger.refType, 'order_release'), eq(stockLedger.refId, 'O')))
      .toSQL();

    expect(sql.toLowerCase()).toContain('ref_type');
    expect(sql.toLowerCase()).toContain('ref_id');
    expect(params).toEqual(['order_release', 'O']);
  });

  it('reads the order lines it will reverse', () => {
    const { sql } = db
      .select({ productId: orderItems.productId, batchId: orderItems.batchId, qty: orderItems.qty })
      .from(orderItems)
      .where(eq(orderItems.orderId, 'O'))
      .toSQL();

    expect(sql.toLowerCase()).toContain('order_items');
    expect(sql.toLowerCase()).toContain('batch_id');
  });
});
