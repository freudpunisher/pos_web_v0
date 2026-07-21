-- Restobar features: locations, two-tier stock, tables, order workflow, waiter assignment

-- New enums
CREATE TYPE "public"."product_type" AS ENUM('drink', 'food');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'preparing', 'ready', 'served', 'paid', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."location_type" AS ENUM('principal', 'secondary');--> statement-breakpoint
CREATE TYPE "public"."table_status" AS ENUM('free', 'occupied', 'reserved');--> statement-breakpoint

-- Extend enums
ALTER TYPE "public"."user_role" ADD VALUE 'waiter';--> statement-breakpoint
ALTER TYPE "public"."stock_movement_type" ADD VALUE 'transfer';--> statement-breakpoint

-- Add product_type to products
ALTER TABLE "products" ADD COLUMN "product_type" "product_type" DEFAULT 'food' NOT NULL;--> statement-breakpoint

-- Locations table
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "location_type" DEFAULT 'secondary' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);--> statement-breakpoint

-- Add location_id to stock
ALTER TABLE "stock" ADD COLUMN "location_id" uuid;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Create default principal location and assign existing stock to it
INSERT INTO "locations" ("name", "type") VALUES ('Principal Stock', 'principal');--> statement-breakpoint
UPDATE "stock" SET "location_id" = (SELECT id FROM "locations" WHERE "type" = 'principal' LIMIT 1);--> statement-breakpoint
ALTER TABLE "stock" ALTER COLUMN "location_id" SET NOT NULL;--> statement-breakpoint

-- Stock transfers table
CREATE TABLE "stock_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"from_location_id" uuid NOT NULL,
	"to_location_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"notes" text
);--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_location_id_locations_id_fk" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_location_id_locations_id_fk" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Tables (restaurant floor)
CREATE TABLE "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer NOT NULL,
	"capacity" integer DEFAULT 4 NOT NULL,
	"status" "table_status" DEFAULT 'free' NOT NULL,
	"section" text,
	CONSTRAINT "tables_number_unique" UNIQUE("number")
);--> statement-breakpoint

-- Order workflow columns on transactions
ALTER TABLE "transactions" ADD COLUMN "order_status" "order_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "waiter_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "table_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_waiter_id_users_id_fk" FOREIGN KEY ("waiter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Make payment_method nullable (pending orders don't have one)
ALTER TABLE "transactions" ALTER COLUMN "payment_method" DROP NOT NULL;--> statement-breakpoint

-- Set defaults for existing transactions
UPDATE "transactions" SET "order_status" = 'paid' WHERE "status" = 'completed';--> statement-breakpoint
UPDATE "transactions" SET "order_status" = 'cancelled' WHERE "status" = 'cancelled';
