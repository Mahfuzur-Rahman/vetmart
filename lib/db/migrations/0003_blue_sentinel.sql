ALTER TABLE "products" ADD COLUMN "has_shipping_charge" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "shipping_inside_dhaka" integer DEFAULT 7000 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "shipping_outside_dhaka" integer DEFAULT 13000 NOT NULL;