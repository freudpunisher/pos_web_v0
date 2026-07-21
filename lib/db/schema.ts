import { pgTable, text, integer, timestamp, numeric, uuid, pgEnum, boolean } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "manager", "cashier", "waiter", "chef", "stock_manager"])
export const productTypeEnum = pgEnum("product_type", ["drink", "food", "ingredient", "others"])
export const orderStatusEnum = pgEnum("order_status", ["pending", "preparing", "ready", "served", "paid", "cancelled"])
export const transactionTypeEnum = pgEnum("transaction_type", ["sale", "purchase", "credit_payment"])
export const transactionStatusEnum = pgEnum("transaction_status", ["completed", "pending", "cancelled"])
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "credit", "card"])
export const poStatusEnum = pgEnum("po_status", ["pending", "received", "cancelled"])
export const stockMovementTypeEnum = pgEnum("stock_movement_type", ["in", "out", "adjustment", "transfer", "inventory"])
export const creditStatusEnum = pgEnum("credit_status", ["paid", "partial", "overdue", "pending"])
export const creditPaymentMethodEnum = pgEnum("credit_payment_method", ["cash", "card"])
export const inventoryAdjustmentTypeEnum = pgEnum("inventory_adjustment_type", ["stock_count", "damage", "loss", "return", "transfer", "correction", "opening_stock", "addition", "subtraction"])
export const inventorySessionStatusEnum = pgEnum("inventory_session_status", ["in_progress", "completed", "reconciled"])
export const locationTypeEnum = pgEnum("location_type", ["principal", "transitional", "bar", "kitchen"])
export const tableStatusEnum = pgEnum("table_status", ["free", "occupied", "reserved"])
export const transferTypeEnum = pgEnum("transfer_type", ["demand", "direct"])
export const productionStatusEnum = pgEnum("production_status", ["planned", "in_progress", "completed", "cancelled"])
export const expenseCategoryEnum = pgEnum("expense_category", [
    "rent", "utilities", "salaries", "supplies", "maintenance",
    "marketing", "transport", "insurance", "taxes", "other"
])
export const cashFlowTypeEnum = pgEnum("cash_flow_type", ["inflow", "outflow"])
export const cashFlowCategoryEnum = pgEnum("cash_flow_category", ["sale", "purchase", "expense", "other"])
export const caisseSessionStatusEnum = pgEnum("caisse_session_status", ["open", "closed"])
export const caisseMovementTypeEnum = pgEnum("caisse_movement_type", ["in", "out"])

// Tables
export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    role: userRoleEnum("role").notNull().default("cashier"),
    password: text("password").notNull(),
    avatar: text("avatar"),
})

export const categoryGroups = pgTable("category_groups", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    description: text("description"),
})

export const categories = pgTable("categories", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    groupId: uuid("group_id").references(() => categoryGroups.id),
})

export const products = pgTable("products", {
    id: uuid("id").primaryKey().defaultRandom(),
    sku: text("sku").notNull().unique(),
    name: text("name").notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    productType: productTypeEnum("product_type").notNull().default("food"),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    sector: text("sector"),
    type: text("type"),
    unit: text("unit"),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    stock: numeric("stock", { precision: 12, scale: 6 }).notNull().default("0"),
    minStock: integer("min_stock").notNull().default(0),
    trackStock: boolean("track_stock").notNull().default(false),
    image: text("image"),
    quantityPerBox: integer("quantity_per_box").default(1),
})

export const locations = pgTable("locations", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: locationTypeEnum("type").notNull().default("bar"),
    isActive: boolean("is_active").notNull().default(true),
})

export const productSellingUnits = pgTable("product_selling_units", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unitId: uuid("unit_id").references(() => measurementUnits.id),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    conversionFactor: numeric("conversion_factor", { precision: 12, scale: 6 }).notNull().default("1"),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
})

export const measurementUnits = pgTable("measurement_units", {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(), // e.g. kg, g, l, ml, unit
    name: text("name").notNull(), // e.g. Kilogramme
    symbol: text("symbol"), // e.g. kg
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const stock = pgTable("stock", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").notNull().references(() => locations.id),
    quantityOnHand: numeric("quantity_on_hand", { precision: 12, scale: 6 }).notNull().default("0"),
    quantityReserved: numeric("quantity_reserved", { precision: 12, scale: 6 }).notNull().default("0"),
    reorderLevel: integer("reorder_level").notNull().default(10),
    reorderQuantity: integer("reorder_quantity").notNull().default(20),
    lastCountedDate: timestamp("last_counted_date"),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
})

export const stockTransfers = pgTable("stock_transfers", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").references(() => products.id),
    fromLocationId: uuid("from_location_id").notNull().references(() => locations.id),
    toLocationId: uuid("to_location_id").notNull().references(() => locations.id),
    quantity: numeric("quantity", { precision: 12, scale: 3 }),
    transferType: transferTypeEnum("transfer_type").notNull().default("demand"),
    userId: uuid("user_id").notNull().references(() => users.id),
    date: timestamp("date").notNull().defaultNow(),
    notes: text("notes"),
    status: text("status").notNull().default("pending"),
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    receivedAt: timestamp("received_at"),
})

export const stockTransferItems = pgTable("stock_transfer_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: uuid("transfer_id").notNull().references(() => stockTransfers.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
})

export const tables = pgTable("tables", {
    id: uuid("id").primaryKey().defaultRandom(),
    number: integer("number").notNull().unique(),
    capacity: integer("capacity").notNull().default(4),
    status: tableStatusEnum("status").notNull().default("free"),
    section: text("section"),
})

export const stockAdjustments = pgTable("stock_adjustments", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    quantityChange: numeric("quantity_change", { precision: 12, scale: 3 }).notNull(),
    adjustmentType: inventoryAdjustmentTypeEnum("adjustment_type").notNull(),
    reason: text("reason").notNull(),
    referenceNumber: text("reference_number"),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdDate: timestamp("created_date").notNull().defaultNow(),
    notes: text("notes"),
})

export const inventory = pgTable("inventory", {
    id: uuid("id").primaryKey().defaultRandom(),
    countDate: timestamp("count_date").notNull().defaultNow(),
    countedBy: uuid("counted_by").notNull().references(() => users.id),
    locationId: uuid("location_id").references(() => locations.id),
    status: inventorySessionStatusEnum("status").notNull().default("in_progress"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    inventoryId: uuid("inventory_id").notNull().references(() => inventory.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    quantityInStock: numeric("quantity_in_stock", { precision: 12, scale: 3 }).notNull().default("0"),
    physicalQuantity: numeric("physical_quantity", { precision: 12, scale: 3 }).notNull(),
    variance: numeric("variance", { precision: 12, scale: 3 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clients = pgTable("clients", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    creditBalance: numeric("credit_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).notNull().default("0"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const suppliers = pgTable("suppliers", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(),
    isActive: boolean("is_active").notNull().default(true),
})

export const transactions = pgTable("transactions", {
    id: uuid("id").primaryKey().defaultRandom(),
    type: transactionTypeEnum("type").notNull().default("sale"),
    date: timestamp("date").notNull().defaultNow(),
    total: numeric("total", { precision: 12, scale: 2 }).notNull().default("0"),
    status: transactionStatusEnum("status").notNull().default("completed"),
    orderStatus: orderStatusEnum("order_status").notNull().default("pending"),
    paymentMethod: paymentMethodEnum("payment_method").notNull().default("cash"),
    invoiceRef: text("invoice_ref"),
    clientId: uuid("client_id").references(() => clients.id),
    userId: uuid("user_id").notNull().references(() => users.id),
    waiterId: uuid("waiter_id").references(() => users.id),
    tableId: uuid("table_id").references(() => tables.id),
    reference: text("reference"),
    clientProof: text("client_proof"),
    cancelReason: text("cancel_reason"),
})

export const transactionItems = pgTable("transaction_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id").notNull().references(() => transactions.id),
    productId: uuid("product_id").notNull().references(() => products.id),
    productName: text("product_name").notNull(), // Denormalized for records
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(), // Supports weighted items
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
})

export const purchaseOrders = pgTable("purchase_orders", {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id").notNull().references(() => suppliers.id),
    date: timestamp("date").notNull().defaultNow(),
    status: poStatusEnum("status").notNull().default("pending"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    sector: text("sector").notNull().default("Alimentation"),
    purchaseRef: text("purchase_ref"),
})

export const purchaseOrderItems = pgTable("purchase_order_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    purchaseOrderId: uuid("purchase_order_id").notNull().references(() => purchaseOrders.id),
    productId: uuid("product_id").notNull().references(() => products.id),
    productName: text("product_name").notNull(), // Denormalized
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    cost: numeric("cost", { precision: 12, scale: 2 }).notNull(),
})

export const stockMovements = pgTable("stock_movements", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id),
    productName: text("product_name").notNull(), // Denormalized
    type: stockMovementTypeEnum("type").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    date: timestamp("date").notNull().defaultNow(),
    userId: uuid("user_id").notNull().references(() => users.id),
    locationId: uuid("location_id").references(() => locations.id),
    referenceId: uuid("reference_id"),
    referenceType: text("reference_type"),
    notes: text("notes"),
})

export const creditRecords = pgTable("credit_records", {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").notNull().references(() => clients.id),
    transactionId: uuid("transaction_id").notNull().references(() => transactions.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    dueDate: timestamp("due_date").notNull(),
    status: creditStatusEnum("status").notNull().default("pending"),
})

export const creditPayments = pgTable("credit_payments", {
    id: uuid("id").primaryKey().defaultRandom(),
    creditRecordId: uuid("credit_record_id").notNull().references(() => creditRecords.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    date: timestamp("date").notNull().defaultNow(),
    method: creditPaymentMethodEnum("method").notNull(),
    paymentRef: text("payment_ref"),
})

export const storeSettings = pgTable("store_settings", {
    id: uuid("id").primaryKey().defaultRandom(), // Added ID for Drizzle
    name: text("name").notNull(),
    address: text("address").notNull(),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    currencySymbol: text("currency_symbol").notNull(),
    rcNumber: text("rc_number"),
    nifNumber: text("nif_number"),
})

export const recipes = pgTable("recipes", {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id").notNull().references(() => products.id), // The finished product
    name: text("name").notNull(),
    description: text("description"),
    grs: numeric("grs", { precision: 12, scale: 3 }),
    yieldQuantity: numeric("yield_quantity", { precision: 12, scale: 3 }).notNull().default("1"), // How many units this recipe produces
    instructions: text("instructions"),
    isActive: boolean("is_active").notNull().default(true),
})

export const recipeIngredients = pgTable("recipe_ingredients", {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
    ingredientId: uuid("ingredient_id").notNull().references(() => products.id), // The raw material
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(), // Quantity needed per yield
})

export const productionRuns = pgTable("production_runs", {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id").notNull().references(() => recipes.id),
    batchNumber: text("batch_number"),
    plannedQuantity: numeric("planned_quantity", { precision: 12, scale: 3 }).notNull(),
    actualQuantity: numeric("actual_quantity", { precision: 12, scale: 3 }),
    productionCost: numeric("production_cost", { precision: 12, scale: 2 }),
    status: productionStatusEnum("status").notNull().default("planned"),
    startDate: timestamp("start_date").notNull().defaultNow(),
    endDate: timestamp("end_date"),
    producedBy: uuid("produced_by").notNull().references(() => users.id),
    notes: text("notes"),
})

export const expenses = pgTable("expenses", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    category: expenseCategoryEnum("category").notNull(),
    date: timestamp("date").notNull().defaultNow(),
    userId: uuid("user_id").notNull().references(() => users.id),
    paidBy: uuid("paid_by").references(() => users.id),
    recipient: text("recipient"),
    reference: text("reference"),
    validated: boolean("validated").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})

export const cashFlow = pgTable("cash_flow", {
    id: uuid("id").primaryKey().defaultRandom(),
    date: timestamp("date").notNull().defaultNow(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    type: cashFlowTypeEnum("type").notNull(), // Inflow (+) or Outflow (-)
    category: cashFlowCategoryEnum("category").notNull(),
    description: text("description").notNull(),
    referenceId: uuid("reference_id"), // ID of transaction, expense, or purchase_order
    referenceType: text("reference_type"), // 'transaction', 'expense', 'purchase_order'
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    transactions: many(transactions),
    waiterOrders: many(transactions, { relationName: "waiter" }),
    stockMovements: many(stockMovements),
    stockAdjustments: many(stockAdjustments),
    stockTransfers: many(stockTransfers),
    inventorySessions: many(inventory),
    productionRuns: many(productionRuns),
    expenses: many(expenses),
    expensesPaid: many(expenses, { relationName: "paidBy" }),
}))

export const categoriesRelations = relations(categories, ({ many }) => ({
    products: many(products),
}))

export const expensesRelations = relations(expenses, ({ one }) => ({
    user: one(users, {
        fields: [expenses.userId],
        references: [users.id],
    }),
    paidByUser: one(users, {
        fields: [expenses.paidBy],
        references: [users.id],
        relationName: "paidBy",
    }),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
    category: one(categories, {
        fields: [products.categoryId],
        references: [categories.id],
    }),
    stock: many(stock),
    stockAdjustments: many(stockAdjustments),
    transactionItems: many(transactionItems),
    purchaseOrderItems: many(purchaseOrderItems),
    stockMovements: many(stockMovements),
    stockTransfers: many(stockTransfers),
    inventoryItems: many(inventoryItems),
    recipes: many(recipes), // Products that are produced via recipes
    ingredientIn: many(recipeIngredients), // Products used as ingredients
    sellingUnits: many(productSellingUnits),
}))

export const productSellingUnitsRelations = relations(productSellingUnits, ({ one }) => ({
    product: one(products, {
        fields: [productSellingUnits.productId],
        references: [products.id],
    }),
    unit: one(measurementUnits, {
        fields: [productSellingUnits.unitId],
        references: [measurementUnits.id],
    }),
}))

export const stockRelations = relations(stock, ({ one }) => ({
    product: one(products, {
        fields: [stock.productId],
        references: [products.id],
    }),
    location: one(locations, {
        fields: [stock.locationId],
        references: [locations.id],
    }),
}))

export const locationsRelations = relations(locations, ({ many }) => ({
    stock: many(stock),
    transfersFrom: many(stockTransfers, { relationName: "fromLocation" }),
    transfersTo: many(stockTransfers, { relationName: "toLocation" }),
    stockMovements: many(stockMovements),
}))

export const stockTransfersRelations = relations(stockTransfers, ({ one, many }) => ({
    product: one(products, {
        fields: [stockTransfers.productId],
        references: [products.id],
    }),
    fromLocation: one(locations, {
        fields: [stockTransfers.fromLocationId],
        references: [locations.id],
        relationName: "fromLocation",
    }),
    toLocation: one(locations, {
        fields: [stockTransfers.toLocationId],
        references: [locations.id],
        relationName: "toLocation",

    }),
    user: one(users, {
        fields: [stockTransfers.userId],
        references: [users.id],
    }),
    approver: one(users, {
        fields: [stockTransfers.approvedBy],
        references: [users.id],
    }),
    items: many(stockTransferItems),
}))

export const stockTransferItemsRelations = relations(stockTransferItems, ({ one }) => ({
    transfer: one(stockTransfers, {
        fields: [stockTransferItems.transferId],
        references: [stockTransfers.id],
    }),
    product: one(products, {
        fields: [stockTransferItems.productId],
        references: [products.id],
    }),
}))

export const tablesRelations = relations(tables, ({ many }) => ({
    orders: many(transactions),
}))

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
    product: one(products, {
        fields: [stockAdjustments.productId],
        references: [products.id],
    }),
    user: one(users, {
        fields: [stockAdjustments.createdBy],
        references: [users.id],
    }),
}))

export const inventoryRelations = relations(inventory, ({ one, many }) => ({
    user: one(users, {
        fields: [inventory.countedBy],
        references: [users.id],
    }),
    location: one(locations, {
        fields: [inventory.locationId],
        references: [locations.id],
    }),
    items: many(inventoryItems),
}))

export const inventoryItemsRelations = relations(inventoryItems, ({ one }) => ({
    session: one(inventory, {
        fields: [inventoryItems.inventoryId],
        references: [inventory.id],
    }),
    product: one(products, {
        fields: [inventoryItems.productId],
        references: [products.id],
    }),
}))

export const clientsRelations = relations(clients, ({ many }) => ({
    transactions: many(transactions),
    creditRecords: many(creditRecords),
}))

export const suppliersRelations = relations(suppliers, ({ many }) => ({
    purchaseOrders: many(purchaseOrders),
}))

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
    client: one(clients, {
        fields: [transactions.clientId],
        references: [clients.id],
    }),
    user: one(users, {
        fields: [transactions.userId],
        references: [users.id],
    }),
    waiter: one(users, {
        fields: [transactions.waiterId],
        references: [users.id],
        relationName: "waiter",
    }),
    table: one(tables, {
        fields: [transactions.tableId],
        references: [tables.id],
    }),
    items: many(transactionItems),
    creditRecord: one(creditRecords, {
        fields: [transactions.id],
        references: [creditRecords.transactionId],
    }),
}))

export const transactionItemsRelations = relations(transactionItems, ({ one }) => ({
    transaction: one(transactions, {
        fields: [transactionItems.transactionId],
        references: [transactions.id],
    }),
    product: one(products, {
        fields: [transactionItems.productId],
        references: [products.id],
    }),
}))

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
    supplier: one(suppliers, {
        fields: [purchaseOrders.supplierId],
        references: [suppliers.id],
    }),
    items: many(purchaseOrderItems),
}))

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
    purchaseOrder: one(purchaseOrders, {
        fields: [purchaseOrderItems.purchaseOrderId],
        references: [purchaseOrders.id],
    }),
    product: one(products, {
        fields: [purchaseOrderItems.productId],
        references: [products.id],
    }),
}))

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
    product: one(products, {
        fields: [stockMovements.productId],
        references: [products.id],
    }),
    user: one(users, {
        fields: [stockMovements.userId],
        references: [users.id],
    }),
    location: one(locations, {
        fields: [stockMovements.locationId],
        references: [locations.id],
    }),
}))

export const creditRecordsRelations = relations(creditRecords, ({ one, many }) => ({
    client: one(clients, {
        fields: [creditRecords.clientId],
        references: [clients.id],
    }),
    transaction: one(transactions, {
        fields: [creditRecords.transactionId],
        references: [transactions.id],
    }),
    payments: many(creditPayments),
}))

export const creditPaymentsRelations = relations(creditPayments, ({ one }) => ({
    creditRecord: one(creditRecords, {
        fields: [creditPayments.creditRecordId],
        references: [creditRecords.id],
    }),
}))

// Caisse / Cash Register sessions
export const caisseSessions = pgTable("caisse_sessions", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id),
    openedAt: timestamp("opened_at").notNull().defaultNow(),
    closedAt: timestamp("closed_at"),
    openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    closingBalance: numeric("closing_balance", { precision: 12, scale: 2 }),
    expectedBalance: numeric("expected_balance", { precision: 12, scale: 2 }),
    difference: numeric("difference", { precision: 12, scale: 2 }),
    status: caisseSessionStatusEnum("status").notNull().default("open"),
    notes: text("notes"),
    locationId: uuid("location_id").references(() => locations.id),
})

export const caisseMovements = pgTable("caisse_movements", {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id").notNull().references(() => caisseSessions.id, { onDelete: "cascade" }),
    type: caisseMovementTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})

// Relations for caisse
export const caisseSessionsRelations = relations(caisseSessions, ({ one, many }) => ({
    user: one(users, {
        fields: [caisseSessions.userId],
        references: [users.id],
    }),
    location: one(locations, {
        fields: [caisseSessions.locationId],
        references: [locations.id],
    }),
    movements: many(caisseMovements),
}))

export const caisseMovementsRelations = relations(caisseMovements, ({ one }) => ({
    session: one(caisseSessions, {
        fields: [caisseMovements.sessionId],
        references: [caisseSessions.id],
    }),
}))

// Menu permissions (which roles can see which menu items)
export const menuPermissions = pgTable("menu_permissions", {
    id: uuid("id").primaryKey().defaultRandom(),
    href: text("href").notNull().unique(),
    label: text("label").notNull(),
    icon: text("icon").notNull(),
    roles: text("roles").array().notNull().default(["admin"]),
    sortOrder: integer("sort_order").notNull().default(0),
})

// Notifications
export const notifications = pgTable("notifications", {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(),
    message: text("message").notNull(),
    relatedId: text("related_id"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
})
