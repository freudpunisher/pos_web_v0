-- Add new location types to the existing enum
ALTER TYPE location_type ADD VALUE IF NOT EXISTS 'transitional';
ALTER TYPE location_type ADD VALUE IF NOT EXISTS 'bar';
ALTER TYPE location_type ADD VALUE IF NOT EXISTS 'kitchen';

-- Create transfer_type enum
DO $$ BEGIN
    CREATE TYPE transfer_type AS ENUM ('demand', 'direct');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add transfer_type column to stock_transfers
ALTER TABLE "stock_transfers" ADD COLUMN IF NOT EXISTS "transfer_type" transfer_type NOT NULL DEFAULT 'demand';
