CREATE TABLE IF NOT EXISTS "menu_permissions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "href" text NOT NULL UNIQUE,
    "label" text NOT NULL,
    "icon" text NOT NULL,
    "roles" text[] NOT NULL DEFAULT '{admin}',
    "sort_order" integer NOT NULL DEFAULT 0
);

-- Seed default menu permissions matching the hardcoded sidebar items
INSERT INTO "menu_permissions" (href, label, icon, roles, sort_order) VALUES
    ('/dashboard', 'Dashboard', 'LayoutDashboard', '{admin,manager,cashier}', 1),
    ('/sales', 'Sales (POS)', 'ShoppingCart', '{admin,manager,cashier}', 2),
    ('/sales-history', 'Sales History', 'Receipt', '{admin,manager,cashier}', 3),
    ('/purchases', 'Purchases', 'Truck', '{admin,manager}', 4),
    ('/products', 'Product Management', 'Package', '{admin,manager,cashier}', 5),
    ('/inventory', 'Stock Status', 'Warehouse', '{admin,manager,cashier}', 6),
    ('/inventory/adjustments', 'Stock Adjustments', 'RefreshCw', '{admin,manager}', 7),
    ('/inventory/count', 'Inventory Count', 'ClipboardList', '{admin,manager}', 8),
    ('/stock-movements', 'Stock Movements', 'ArrowLeftRight', '{admin,manager}', 9),
    ('/stock/transfers', 'Stock Transfers', 'ArrowRightLeft', '{admin,manager}', 10),
    ('/expenses', 'Expenses', 'Wallet', '{admin,manager}', 11),
    ('/staff-tables', 'Staff & Tables', 'UserCog', '{admin,manager}', 12),
    ('/clients', 'Clients', 'Users', '{admin,manager,cashier}', 13),
    ('/credit', 'Credit Management', 'CreditCard', '{admin,manager}', 14),
    ('/reports', 'Reports', 'BarChart3', '{admin,manager}', 15),
npm run migrate    ('/settings', 'Settings', 'Settings', '{admin}', 16),
    ('/notifications', 'Notifications', 'Bell', '{admin,manager,cashier}', 111)
ON CONFLICT (href) DO NOTHING;
