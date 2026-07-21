ALTER TABLE "inventory" ADD COLUMN "location_id" uuid REFERENCES "locations"("id");
