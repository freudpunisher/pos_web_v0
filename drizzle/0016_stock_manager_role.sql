-- Add stock_manager role to user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'stock_manager';
