-- Create product_types table
CREATE TABLE "product_types" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL UNIQUE,
    "slug" text NOT NULL UNIQUE,
    "icon" text,
    "color" text,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean NOT NULL DEFAULT true,
    CONSTRAINT "product_types_name_unique" UNIQUE ("name"),
    CONSTRAINT "product_types_slug_unique" UNIQUE ("slug")
);

--> statement-breakpoint

-- Insert default types (mapping old enum values)
INSERT INTO "product_types" ("name", "slug", "icon", "color", "sort_order") VALUES
('Vêtement', 'vetement', 'Shirt', 'bg-blue-500/20 text-blue-700', 1),
('Chaussure', 'chaussure', 'Footprints', 'bg-amber-500/20 text-amber-700', 2),
('Accessoire', 'accessoire', 'Watch', 'bg-purple-500/20 text-purple-700', 3),
('Maison', 'maison', 'Home', 'bg-green-500/20 text-green-700', 4),
('Autres', 'autres', 'Package', 'bg-gray-500/20 text-gray-700', 5);

--> statement-breakpoint

-- Add product_type_id column to products
ALTER TABLE "products" ADD COLUMN "product_type_id" uuid REFERENCES "product_types"("id");

--> statement-breakpoint

-- Map old productType values to new product_type_id (best-effort defaults)
UPDATE "products" SET "product_type_id" = (SELECT "id" FROM "product_types" WHERE "slug" = 'autres');

--> statement-breakpoint

-- Drop old productType column and enum
ALTER TABLE "products" DROP COLUMN IF EXISTS "product_type";

--> statement-breakpoint

-- Drop old enum type
DROP TYPE IF EXISTS "product_type";
