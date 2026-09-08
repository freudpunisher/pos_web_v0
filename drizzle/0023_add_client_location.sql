-- Add location_id column to clients table
ALTER TABLE "clients" ADD COLUMN "location_id" uuid REFERENCES "locations"("id");

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "clients_location_id_idx" ON "clients"("location_id");
