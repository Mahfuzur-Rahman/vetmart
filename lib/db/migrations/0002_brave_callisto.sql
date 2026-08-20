-- 0002: guest/express order columns, idempotency key, and catch-up for three
-- tables that existed in the Drizzle schema but had never been migrated.
--
-- Every statement is idempotent. The live Aiven database had drifted from the
-- migration history: drug_classifications, species_categories and
-- categories.show_on_homepage were already present (created outside migrations,
-- i.e. by `db:push`, which §3 forbids), while products.drug_classification_id,
-- incomplete_orders and the new orders columns were not. A plain CREATE TABLE
-- would abort the whole migration on its first statement, so this file is
-- written to reconcile either state — a drifted database or a fresh one.

CREATE TABLE IF NOT EXISTS "drug_classifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"emoji" text DEFAULT '💊' NOT NULL,
	"description_en" text,
	"description_bn" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"show_on_menu" boolean DEFAULT true NOT NULL,
	"show_on_homepage" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drug_classifications_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "species_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"slug" text NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"emoji" text DEFAULT '🐾' NOT NULL,
	"image_path" text,
	"description_en" text,
	"description_bn" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"show_on_homepage" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "species_categories_key_unique" UNIQUE("key"),
	CONSTRAINT "species_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "incomplete_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"name" text,
	"address" text,
	"division" text,
	"district" text,
	"upazila" text,
	"items" jsonb NOT NULL,
	"subtotal" integer NOT NULL,
	"delivery_fee" integer DEFAULT 0 NOT NULL,
	"total_amount" integer NOT NULL,
	"utm_source" text,
	"utm_campaign" text,
	"utm_medium" text,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "show_on_homepage" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "drug_classification_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guest_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "guest_phone" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "source_channel" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "utm_source" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "idempotency_key" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_classifications_slug_idx" ON "drug_classifications" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "drug_classifications_sort_idx" ON "drug_classifications" USING btree ("sort");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "species_categories_key_idx" ON "species_categories" USING btree ("key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "species_categories_slug_idx" ON "species_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "species_categories_sort_idx" ON "species_categories" USING btree ("sort");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incomplete_orders_phone_idx" ON "incomplete_orders" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incomplete_orders_status_idx" ON "incomplete_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incomplete_orders_created_at_idx" ON "incomplete_orders" USING btree ("created_at");--> statement-breakpoint
DO $$ BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'products_drug_classification_id_drug_classifications_id_fk'
	) THEN
		ALTER TABLE "products"
			ADD CONSTRAINT "products_drug_classification_id_drug_classifications_id_fk"
			FOREIGN KEY ("drug_classification_id")
			REFERENCES "public"."drug_classifications"("id")
			ON DELETE no action ON UPDATE no action;
	END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "products_drug_class_idx" ON "products" USING btree ("drug_classification_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "orders_guest_phone_idx" ON "orders" USING btree ("guest_phone");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "orders_idempotency_key_idx" ON "orders" USING btree ("idempotency_key");
