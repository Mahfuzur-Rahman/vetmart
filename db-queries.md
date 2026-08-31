# Database Select Queries

This file contains standard `SELECT * FROM` queries for all tables in the VetMart database.

If you add new tables to the database schema (`lib/db/schema/`), simply append their corresponding select queries here.

## 1. System Tables (`lib/db/schema/system.ts`)
```sql
SELECT * FROM settings;
SELECT * FROM translations;
SELECT * FROM delivery_zones;
SELECT * FROM homepage_sections;
SELECT * FROM coupons;
SELECT * FROM jobs;
```

## 2. Order Tables (`lib/db/schema/orders.ts`)
```sql
SELECT * FROM carts;
SELECT * FROM cart_items;
SELECT * FROM prescriptions;
SELECT * FROM orders;
SELECT * FROM order_items;
SELECT * FROM order_events;
SELECT * FROM shipments;
SELECT * FROM payments;
SELECT * FROM invoices;
SELECT * FROM incomplete_orders;
```

## 3. Catalog Tables (`lib/db/schema/catalog.ts`)
```sql
SELECT * FROM manufacturers;
SELECT * FROM categories;
SELECT * FROM species_categories;
SELECT * FROM drug_classifications;
SELECT * FROM products;
SELECT * FROM product_images;
SELECT * FROM product_batches;
SELECT * FROM stock_ledger;
SELECT * FROM product_reviews;
```

## 4. Auth & User Tables (`lib/db/schema/auth.ts`)
```sql
SELECT * FROM users;
SELECT * FROM addresses;
SELECT * FROM admins;
SELECT * FROM roles;
SELECT * FROM permissions;
SELECT * FROM role_permissions;
SELECT * FROM admin_roles;
SELECT * FROM audit_log;
SELECT * FROM device_sessions;
SELECT * FROM otp_requests;
```
