-- Add location_id, reference_id, reference_type columns to stock_movements
ALTER TABLE "stock_movements" ADD COLUMN "location_id" uuid REFERENCES "locations"("id");
ALTER TABLE "stock_movements" ADD COLUMN "reference_id" uuid;
ALTER TABLE "stock_movements" ADD COLUMN "reference_type" text;

-- Migrate stock_movement_type enum: sale->out, purchase->in, keep adjustment/transfer, add inventory
CREATE TYPE "stock_movement_type_new" AS ENUM ('in', 'out', 'adjustment', 'transfer', 'inventory');

ALTER TABLE "stock_movements"
  ALTER COLUMN "type" TYPE "stock_movement_type_new"
  USING (
    CASE "type"::text
      WHEN 'sale' THEN 'out'::stock_movement_type_new
      WHEN 'purchase' THEN 'in'::stock_movement_type_new
      WHEN 'adjustment' THEN 'adjustment'::stock_movement_type_new
      WHEN 'transfer' THEN 'transfer'::stock_movement_type_new
    END
  );

DROP TYPE "stock_movement_type";

ALTER TYPE "stock_movement_type_new" RENAME TO "stock_movement_type";
