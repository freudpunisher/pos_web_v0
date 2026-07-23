-- Create user_locations table for assigning cashiers to specific locations
CREATE TABLE IF NOT EXISTS "user_locations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "location_id" uuid NOT NULL REFERENCES "locations"("id") ON DELETE CASCADE,
    "created_at" timestamp NOT NULL DEFAULT now(),
    UNIQUE("user_id", "location_id")
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS "user_locations_user_id_idx" ON "user_locations"("user_id");
CREATE INDEX IF NOT EXISTS "user_locations_location_id_idx" ON "user_locations"("location_id");
