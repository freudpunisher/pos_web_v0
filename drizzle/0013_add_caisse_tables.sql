DO $$ BEGIN
    CREATE TYPE "public"."caisse_session_status" AS ENUM('open', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."caisse_movement_type" AS ENUM('in', 'out');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "caisse_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "users"("id"),
    "opened_at" timestamp DEFAULT now() NOT NULL,
    "closed_at" timestamp,
    "opening_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
    "closing_balance" numeric(12, 2),
    "expected_balance" numeric(12, 2),
    "difference" numeric(12, 2),
    "status" "caisse_session_status" DEFAULT 'open' NOT NULL,
    "notes" text,
    "location_id" uuid REFERENCES "locations"("id")
);

CREATE TABLE IF NOT EXISTS "caisse_movements" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "session_id" uuid NOT NULL REFERENCES "caisse_sessions"("id") ON DELETE CASCADE,
    "type" "caisse_movement_type" NOT NULL,
    "amount" numeric(12, 2) NOT NULL,
    "reason" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);
