CREATE TABLE "drug_classifications" (
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
CREATE TABLE "species_categories" (
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
CREATE TABLE "incomplete_orders" (
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
ALTER TABLE "categories" ADD COLUMN "show_on_homepage" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "drug_classification_id" uuid;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "guest_phone" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source_channel" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "utm_source" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "utm_campaign" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE INDEX "drug_classifications_slug_idx" ON "drug_classifications" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "drug_classifications_sort_idx" ON "drug_classifications" USING btree ("sort");--> statement-breakpoint
CREATE INDEX "species_categories_key_idx" ON "species_categories" USING btree ("key");--> statement-breakpoint
CREATE INDEX "species_categories_slug_idx" ON "species_categories" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "species_categories_sort_idx" ON "species_categories" USING btree ("sort");--> statement-breakpoint
CREATE INDEX "incomplete_orders_phone_idx" ON "incomplete_orders" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "incomplete_orders_status_idx" ON "incomplete_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "incomplete_orders_created_at_idx" ON "incomplete_orders" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_drug_classification_id_drug_classifications_id_fk" FOREIGN KEY ("drug_classification_id") REFERENCES "public"."drug_classifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_drug_class_idx" ON "products" USING btree ("drug_classification_id");--> statement-breakpoint
CREATE INDEX "orders_guest_phone_idx" ON "orders" USING btree ("guest_phone");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_idempotency_key_idx" ON "orders" USING btree ("idempotency_key");