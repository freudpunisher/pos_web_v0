CREATE TABLE IF NOT EXISTS "product_selling_units" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
    "name" text NOT NULL,
    "unit_id" uuid REFERENCES "measurement_units"("id"),
    "price" numeric(12, 2) NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL
);
