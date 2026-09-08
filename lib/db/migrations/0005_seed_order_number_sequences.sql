-- 0005_seed_order_number_sequences.sql
--
-- Start the sequences added in 0004 above any number the database already
-- holds.
--
-- Orders placed before 0004 carry a random four-digit suffix (ORD-2609-9074,
-- INV-2609-9091, …). A sequence starting at 1 walks straight through that range,
-- so if it reached a used suffix while still inside the same YYMM prefix the
-- insert would hit the UNIQUE constraint and fail the checkout — reintroducing
-- the exact bug 0004 removed, just later and more rarely.
--
-- On a fresh database MAX is NULL, so both calls collapse to "next value is 1"
-- and this is a no-op. Rows whose number does not match the expected shape are
-- ignored by the regex rather than breaking the migration.
SELECT setval(
  'order_no_seq',
  COALESCE(
    (SELECT MAX((regexp_match(order_no, '^ORD-\d{4}-(\d+)$'))[1]::bigint) FROM orders),
    0
  ) + 1,
  false
);--> statement-breakpoint
SELECT setval(
  'invoice_no_seq',
  COALESCE(
    (SELECT MAX((regexp_match(invoice_no, '^INV-\d{4}-(\d+)$'))[1]::bigint) FROM invoices),
    0
  ) + 1,
  false
);
