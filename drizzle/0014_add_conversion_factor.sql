ALTER TABLE "product_selling_units" ADD COLUMN IF NOT EXISTS "conversion_factor" numeric(12, 6) DEFAULT '1' NOT NULL;
