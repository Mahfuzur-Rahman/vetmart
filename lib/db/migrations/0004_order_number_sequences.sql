-- 0004_order_number_sequences.sql
--
-- §11: "Invoice number: INV-{YY}{MM}-{seq}, sequence from a Postgres sequence,
-- never reused, never gapped."
--
-- Both numbers were previously `Math.floor(1000 + Math.random() * 9000)`, i.e.
-- 9000 possible values per month, written into UNIQUE columns. By ~120 orders in
-- a month the chance of at least one collision is over 50%, and a collision
-- surfaced as a failed checkout (unique violation, HTTP 500) — the customer
-- loses the order and the cart still holds the items.
--
-- A sequence removes the collision entirely and makes the numbers auditable.
CREATE SEQUENCE IF NOT EXISTS order_no_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS invoice_no_seq AS bigint START WITH 1 INCREMENT BY 1 MINVALUE 1 NO MAXVALUE CACHE 1;
