-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 0020: Resto-Bar → General Retail/Shop Model
-- ═══════════════════════════════════════════════════════════════════════════
-- PostgreSQL does NOT support ALTER TYPE ... DROP VALUE.
-- Strategy: create new enum types → add new columns → migrate data →
--           drop old columns → drop old enum types → rename new → done.
-- ═══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Create new enum types ──────────────────────────────────────────────

CREATE TYPE "user_role_new" AS ENUM ("admin", "manager", "cashier", "stock_manager");

CREATE TYPE "order_status_new" AS ENUM ("pending", "confirmed", "completed", "cancelled");

CREATE TYPE "location_type_new" AS ENUM ("warehouse", "store", "branch", "delivery_point");

-- ─── 2. Migrate users.role ─────────────────────────────────────────────────
--    waiter/chef → cashier (closest retail equivalent)

ALTER TABLE "users" ADD COLUMN "role_new" "user_role_new" DEFAULT 'cashier' NOT NULL;

UPDATE "users" SET "role_new" = CASE
    WHEN "role" IN ('waiter', 'chef') THEN 'cashier'::user_role_new
    WHEN "role" = 'admin' THEN 'admin'::user_role_new
    WHEN "role" = 'manager' THEN 'manager'::user_role_new
    WHEN "role" = 'cashier' THEN 'cashier'::user_role_new
    WHEN "role" = 'stock_manager' THEN 'stock_manager'::user_role_new
    ELSE 'cashier'::user_role_new
END;

ALTER TABLE "users" DROP COLUMN "role";
ALTER TABLE "users" RENAME COLUMN "role_new" TO "role";

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_role_check";
DROP TYPE "user_role";
ALTER TYPE "user_role_new" RENAME TO "user_role";

-- ─── 3. Migrate locations.type ─────────────────────────────────────────────
--    bar → store, kitchen → store, principal → warehouse, transitional → warehouse

ALTER TABLE "locations" ADD COLUMN "type_new" "location_type_new" DEFAULT 'store' NOT NULL;

UPDATE "locations" SET "type_new" = CASE
    WHEN "type" = 'bar' THEN 'store'::location_type_new
    WHEN "type" = 'kitchen' THEN 'store'::location_type_new
    WHEN "type" = 'principal' THEN 'warehouse'::location_type_new
    WHEN "type" = 'transitional' THEN 'warehouse'::location_type_new
    ELSE 'store'::location_type_new
END;

ALTER TABLE "locations" DROP COLUMN "type";
ALTER TABLE "locations" RENAME COLUMN "type_new" TO "type";

DROP TYPE "location_type";
ALTER TYPE "location_type_new" RENAME TO "location_type";

-- ─── 4. Migrate transactions.orderStatus to new enum ───────────────────────
--    preparing → confirmed, ready → confirmed, served → completed, paid → completed

ALTER TABLE "transactions" ADD COLUMN "order_status_new" "order_status_new" DEFAULT 'pending';

UPDATE "transactions" SET "order_status_new" = CASE
    WHEN "orderStatus" = 'pending' THEN 'pending'::order_status_new
    WHEN "orderStatus" = 'preparing' THEN 'confirmed'::order_status_new
    WHEN "orderStatus" = 'ready' THEN 'confirmed'::order_status_new
    WHEN "orderStatus" = 'served' THEN 'completed'::order_status_new
    WHEN "orderStatus" = 'paid' THEN 'completed'::order_status_new
    WHEN "orderStatus" = 'cancelled' THEN 'cancelled'::order_status_new
    ELSE 'pending'::order_status_new
END;

ALTER TABLE "transactions" DROP COLUMN "orderStatus";
ALTER TABLE "transactions" RENAME COLUMN "order_status_new" TO "orderStatus";

DROP TYPE "order_status";
ALTER TYPE "order_status_new" RENAME TO "order_status";

-- ─── 5. Remove tables referenced by transactions ───────────────────────────
--    Must drop FK constraints first, then the table.

-- Drop transactions.tableId FK constraint (find the actual constraint name)
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_table_id_tables_id_fk";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "tableId";

-- Drop transactions.waiterId FK constraint
ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_waiter_id_users_id_fk";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "waiterId";

-- Drop table_status enum and tables table
DROP TABLE IF EXISTS "tables" CASCADE;
DROP TYPE IF EXISTS "table_status";

-- ─── 6. Add locationId + deliveryLocationId to transactions ────────────────

ALTER TABLE "transactions" ADD COLUMN "locationId" UUID REFERENCES "locations"("id");
ALTER TABLE "transactions" ADD COLUMN "deliveryLocationId" UUID REFERENCES "locations"("id");

-- Backfill locationId from existing stock movements (use the most common location for the transaction)
UPDATE "transactions" t SET "locationId" = (
    SELECT sm."locationId"
    FROM "stock_movements" sm
    WHERE sm."referenceId" = t."id"
      AND sm."locationId" IS NOT NULL
    LIMIT 1
)
WHERE t."locationId" IS NULL AND t."type" = 'sale';

-- Fallback: set to the first location for any remaining NULL locationIds
UPDATE "transactions" SET "locationId" = (
    SELECT "id" FROM "locations" LIMIT 1
)
WHERE "locationId" IS NULL AND "type" = 'sale';

-- ─── 7. Add transactionId to stock_transfers ───────────────────────────────

ALTER TABLE "stock_transfers" ADD COLUMN "transactionId" UUID REFERENCES "transactions"("id");

-- ─── 8. Drop old table references in relations ─────────────────────────────
--    (Drizzle handles this via schema, but clean up any orphaned references)

COMMIT;
