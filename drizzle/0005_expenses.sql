CREATE TYPE "public"."expense_category" AS ENUM('rent', 'utilities', 'salaries', 'supplies', 'maintenance', 'marketing', 'transport', 'insurance', 'taxes', 'other');

CREATE TABLE IF NOT EXISTS "expenses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" text NOT NULL,
    "amount" numeric(12, 2) NOT NULL,
    "category" "expense_category" NOT NULL,
    "description" text,
    "date" timestamp NOT NULL DEFAULT now(),
    "user_id" uuid NOT NULL REFERENCES "users"("id"),
    "created_at" timestamp NOT NULL DEFAULT now()
);
