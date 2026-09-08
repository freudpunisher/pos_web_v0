export type UserRole = "admin" | "manager" | "cashier" | "stock_manager"
export type CaisseSessionStatus = "open" | "closed"
export type CaisseMovementType = "in" | "out"
export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled"

export interface ProductTypeRecord {
  id: string
  name: string
  slug: string
  icon: string | null
  color: string | null
  sortOrder: number | null
  isActive: boolean
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  phone?: string
  avatar?: string
}

export interface SellingUnit {
  id: string
  name: string
  unitId?: string | null
  unitName?: string | null
  price: number
  conversionFactor: number
  isDefault: boolean
  sortOrder: number
}

export interface Product {
  id: string
  sku: string
  name: string
  productTypeId: string | null
  productTypeName?: string
  price: number
  stock: number
  minStock: number
  sellingUnits?: SellingUnit[]
}

export interface CartItem extends Product {
  quantity: number
  discount: number
  sellingUnitName?: string
  sellingUnitId?: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  address: string
  locationId: string | null
  creditBalance: number
  creditLimit: number
  createdAt: string
}

export interface Supplier {
  id: string
  name: string
  email: string
  phone: string
  address: string
}

export interface Transaction {
  id: string
  invoiceRef?: string | null
  type: "sale" | "purchase" | "credit_payment"
  date: string
  total: number
  status: "completed" | "pending" | "cancelled"
  orderStatus: OrderStatus
  paymentMethod?: "cash" | "credit" | "card"
  clientId?: string
  items: TransactionItem[]
  userId: string
  locationId?: string
  deliveryLocationId?: string
  reference?: string
  location?: { id: string; name: string }
  deliveryLocation?: { id: string; name: string }
}

export interface TransactionItem {
  productId: string
  productName: string
  quantity: number
  price: number
  discount: number
}

export interface PurchaseOrder {
  id: string
  supplierId: string
  date: string
  status: "pending" | "received" | "cancelled"
  total: number
  sector?: string
  items: PurchaseOrderItem[]
}

export interface PurchaseOrderItem {
  productId: string
  productName: string
  quantity: number
  cost: number
}

export interface StockMovement {
  id: string
  productId: string
  productName: string
  type: "in" | "out" | "adjustment" | "transfer" | "inventory"
  quantity: number
  date: string
  userId: string
  locationId?: string
  location?: { id: string; name: string }
  referenceId?: string
  referenceType?: string
  notes?: string
}

export interface CreditRecord {
  id: string
  clientId: string
  clientName?: string | null
  transactionId: string
  invoiceRef?: string | null
  amount: number | string
  paidAmount: number | string
  dueDate: string
  status: "paid" | "partial" | "overdue" | "pending"
  payments: CreditPayment[]
}

export interface CreditPayment {
  id: string
  amount: number | string
  date: string
  method: "cash" | "card"
  paymentRef?: string | null
}

export interface StoreSettings {
  name: string
  address: string
  phone: string
  email: string
  taxRate: number
  currency: string
  currencySymbol: string
  rcNumber?: string | null
  nifNumber?: string | null
}

export interface CategoryGroup {
  id: string
  name: string
  description?: string
}

export interface Category {
  id: string
  name: string
  description?: string
  groupId?: string | null
}

export interface Location {
  id: string
  name: string
  type: "primary" | "store" | "branch" | "delivery_point"
  isActive: boolean
}

export interface StockTransfer {
  id: string
  productId: string
  fromLocationId: string
  toLocationId: string
  quantity: number
  userId: string
  transactionId?: string | null
  date: string
  notes?: string
  product?: { name: string; sku: string }
  fromLocation?: { name: string }
  toLocation?: { name: string }
}

export interface CaisseMovement {
  id: string
  sessionId: string
  type: CaisseMovementType
  amount: number
  reason: string
  createdAt: string
}

export interface CaisseSession {
  id: string
  userId: string
  openedAt: string
  closedAt: string | null
  openingBalance: number
  closingBalance: number | null
  expectedBalance: number | null
  difference: number | null
  status: CaisseSessionStatus
  notes: string | null
  locationId: string | null
  user?: { id: string; name: string }
  location?: { id: string; name: string }
  movements?: CaisseMovement[]
}

export type ExpenseCategory = "rent" | "utilities" | "salaries" | "supplies" | "maintenance" | "marketing" | "transport" | "insurance" | "taxes" | "other"

export interface Expense {
  id: string
  name: string
  amount: number
  category: ExpenseCategory
  description?: string
  date: string
  userId: string
  user?: { name: string }
  validated: boolean
  createdAt: string
}
