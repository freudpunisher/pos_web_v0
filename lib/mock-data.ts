import type {
  User,
  Product,
  Client,
  Supplier,
  Transaction,
  PurchaseOrder,
  StockMovement,
  CreditRecord,
  StoreSettings,
  Category,
} from "./types"

export const mockUsers: User[] = [
  {
    id: "2f83e92d-b719-4c15-919f-e2ff7640f1c4",
    name: "MUGISHA Freud",
    email: "punishergte@gmail.com",
    role: "admin",
    avatar: "/admin-avatar.png",
  },
  {
    id: "00000000-0000-0000-0000-000000000001",
    name: "John Admin",
    email: "admin@smartpos.com",
    role: "admin",
    avatar: "/admin-avatar.png",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Sarah Manager",
    email: "manager@smartpos.com",
    role: "manager",
    avatar: "/manager-avatar.png",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Mike Cashier",
    email: "cashier@smartpos.com",
    phone: "+1 555-0103",
    role: "cashier_food",
    avatar: "/cashier-avatar.jpg",
  },
]

export const mockCategories: Category[] = [
  { id: "1", name: "Electronics", description: "Electronic devices and accessories" },
  { id: "2", name: "Clothing", description: "Apparel and fashion items" },
  { id: "3", name: "Food & Beverages", description: "Consumable products" },
  { id: "4", name: "Home & Garden", description: "Home improvement items" },
  { id: "5", name: "Sports", description: "Sports equipment and gear" },
]

export const mockProducts: Product[] = [
  {
    id: "1",
    sku: "ELEC-001",
    name: "Wireless Headphones",
    category: "Electronics",
    productType: "drink",
    price: 79.99,
    stock: 45,
    minStock: 10,
    trackStock: true,
    image: "/wireless-headphones.png",
  },
  {
    id: "2",
    sku: "ELEC-002",
    name: "USB-C Cable",
    category: "Electronics",
    productType: "drink",
    price: 12.99,
    stock: 120,
    minStock: 20,
    trackStock: true,
    image: "/usb-cable.png",
  },
  {
    id: "3",
    sku: "ELEC-003",
    name: "Phone Case",
    category: "Electronics",
    productType: "drink",
    price: 24.99,
    stock: 8,
    minStock: 15,

    trackStock: true,    image: "/colorful-phone-case-display.png",
  },
  {
    id: "4",
    sku: "CLOTH-001",
    name: "Cotton T-Shirt",
    category: "Clothing",
    productType: "drink",
    price: 19.99,
    stock: 75,
    minStock: 20,

    trackStock: true,    image: "/cotton-tshirt.png",
  },
  {
    id: "5",
    sku: "CLOTH-002",
    name: "Denim Jeans",
    category: "Clothing",
    productType: "drink",
    price: 49.99,
    stock: 32,
    minStock: 10,

    trackStock: true,    image: "/denim-jeans.png",
  },
  {
    id: "6",
    sku: "CLOTH-003",
    name: "Sneakers",
    category: "Clothing",
    productType: "drink",
    price: 89.99,
    stock: 0,
    minStock: 8,

    trackStock: true,    image: "/diverse-sneaker-collection.png",
  },
  {
    id: "7",
    sku: "FOOD-001",
    name: "Organic Coffee",
    category: "Food & Beverages",
    productType: "drink",
    price: 14.99,
    stock: 60,
    minStock: 15,

    trackStock: true,    image: "/pile-of-coffee-beans.png",
  },
  {
    id: "8",
    sku: "FOOD-002",
    name: "Green Tea Pack",
    category: "Food & Beverages",
    productType: "drink",
    price: 8.99,
    stock: 85,
    minStock: 20,

    trackStock: true,    image: "/cup-of-green-tea.png",
  },
  {
    id: "9",
    sku: "HOME-001",
    name: "LED Desk Lamp",
    category: "Home & Garden",
    productType: "drink",
    price: 34.99,
    stock: 25,
    minStock: 8,

    trackStock: true,    image: "/modern-desk-lamp.png",
  },
  {
    id: "10",
    sku: "HOME-002",
    name: "Plant Pot Set",
    category: "Home & Garden",
    productType: "drink",
    price: 22.99,
    stock: 40,
    minStock: 12,

    trackStock: true,    image: "/terracotta-pot-succulent.png",
  },
  {
    id: "11",
    sku: "SPORT-001",
    name: "Yoga Mat",
    category: "Sports",
    productType: "drink",
    price: 29.99,
    stock: 18,
    minStock: 10,

    trackStock: true,    image: "/rolled-yoga-mat.png",
  },
  {
    id: "12",
    sku: "SPORT-002",
    name: "Resistance Bands",
    category: "Sports",
    productType: "drink",
    price: 15.99,
    stock: 55,
    minStock: 15,

    trackStock: true,    image: "/resistance-bands-exercise.png",
  },
]

export const mockClients: Client[] = [
  {
    id: "1",
    name: "Acme Corporation",
    email: "contact@acme.com",
    phone: "+1 555-0101",
    address: "123 Business Ave, NY 10001",
    creditBalance: 1250.0,
    creditLimit: 5000.0,
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    name: "Tech Solutions Inc",
    email: "info@techsolutions.com",
    phone: "+1 555-0102",
    address: "456 Tech Blvd, CA 94102",
    creditBalance: 0,
    creditLimit: 3000.0,
    createdAt: "2024-02-20",
  },
  {
    id: "3",
    name: "Retail Masters",
    email: "orders@retailmasters.com",
    phone: "+1 555-0103",
    address: "789 Commerce St, TX 75001",
    creditBalance: 3200.0,
    creditLimit: 4000.0,
    createdAt: "2024-03-10",
  },
  {
    id: "4",
    name: "Green Gardens Co",
    email: "hello@greengardens.com",
    phone: "+1 555-0104",
    address: "321 Nature Way, FL 33101",
    creditBalance: 450.0,
    creditLimit: 2000.0,
    createdAt: "2024-04-05",
  },
  {
    id: "5",
    name: "Sports Plus",
    email: "sales@sportsplus.com",
    phone: "+1 555-0105",
    address: "654 Athletic Dr, IL 60601",
    creditBalance: 0,
    creditLimit: 2500.0,
    createdAt: "2024-05-12",
  },
]

export const mockSuppliers: Supplier[] = [
  {
    id: "1",
    name: "Global Electronics",
    email: "orders@globalelec.com",
    phone: "+1 555-1001",
    address: "100 Industrial Park, CA 90210",
  },
  {
    id: "2",
    name: "Fashion Forward",
    email: "supply@fashionforward.com",
    phone: "+1 555-1002",
    address: "200 Textile Ave, NY 10018",
  },
  {
    id: "3",
    name: "Organic Foods Co",
    email: "wholesale@organicfoods.com",
    phone: "+1 555-1003",
    address: "300 Farm Road, WA 98101",
  },
  {
    id: "4",
    name: "Home Essentials Ltd",
    email: "bulk@homeessentials.com",
    phone: "+1 555-1004",
    address: "400 Warehouse Blvd, TX 77001",
  },
]

export const mockTransactions: Transaction[] = [
  {
    id: "TXN-001",
    type: "sale",
    date: "2024-12-15T10:30:00",
    total: 156.97,
    status: "completed",
    orderStatus: "paid",
    paymentMethod: "cash",
    userId: "00000000-0000-0000-0000-000000000003",
    items: [
      { productId: "1", productName: "Wireless Headphones", quantity: 1, price: 79.99, discount: 0 },
      { productId: "4", productName: "Cotton T-Shirt", quantity: 2, price: 19.99, discount: 0 },
      { productId: "7", productName: "Organic Coffee", quantity: 2, price: 14.99, discount: 5 },
    ],
  },
  {
    id: "TXN-002",
    type: "sale",
    date: "2024-12-15T11:45:00",
    total: 89.99,
    status: "completed",
    orderStatus: "paid",
    paymentMethod: "card",
    userId: "00000000-0000-0000-0000-000000000003",
    items: [{ productId: "6", productName: "Sneakers", quantity: 1, price: 89.99, discount: 0 }],
  },
  {
    id: "TXN-003",
    type: "sale",
    date: "2024-12-15T14:20:00",
    total: 234.95,
    status: "completed",
    orderStatus: "paid",
    paymentMethod: "credit",
    clientId: "1",
    userId: "00000000-0000-0000-0000-000000000003",
    items: [
      { productId: "5", productName: "Denim Jeans", quantity: 3, price: 49.99, discount: 0 },
      { productId: "2", productName: "USB-C Cable", quantity: 5, price: 12.99, discount: 10 },
    ],
  },
  {
    id: "TXN-004",
    type: "sale",
    date: "2024-12-14T09:15:00",
    total: 64.97,
    status: "completed",
    orderStatus: "paid",
    paymentMethod: "cash",
    userId: "00000000-0000-0000-0000-000000000002",
    items: [
      { productId: "9", productName: "LED Desk Lamp", quantity: 1, price: 34.99, discount: 0 },
      { productId: "11", productName: "Yoga Mat", quantity: 1, price: 29.99, discount: 0 },
    ],
  },
  {
    id: "TXN-005",
    type: "sale",
    date: "2024-12-14T16:30:00",
    total: 127.96,
    status: "completed",
    orderStatus: "paid",
    paymentMethod: "credit",
    clientId: "3",
    userId: "00000000-0000-0000-0000-000000000003",
    items: [
      { productId: "12", productName: "Resistance Bands", quantity: 4, price: 15.99, discount: 0 },
      { productId: "8", productName: "Green Tea Pack", quantity: 4, price: 8.99, discount: 0 },
      { productId: "10", productName: "Plant Pot Set", quantity: 1, price: 22.99, discount: 5 },
    ],
  },
]

export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "PO-001",
    supplierId: "1",
    date: "2024-12-10",
    status: "received",
    total: 2250.0,
    items: [{ productId: "1", productName: "Wireless Headphones", quantity: 50, cost: 45.0 }],
  },
  {
    id: "PO-002",
    supplierId: "2",
    date: "2024-12-12",
    status: "received",
    total: 1100.0,
    items: [
      { productId: "4", productName: "Cotton T-Shirt", quantity: 100, cost: 8.0 },
      { productId: "5", productName: "Denim Jeans", quantity: 30, cost: 22.0 },
    ],
  },
  {
    id: "PO-003",
    supplierId: "3",
    date: "2024-12-14",
    status: "pending",
    total: 525.0,
    items: [
      { productId: "7", productName: "Organic Coffee", quantity: 50, cost: 7.0 },
      { productId: "8", productName: "Green Tea Pack", quantity: 50, cost: 3.5 },
    ],
  },
]

export const mockStockMovements: StockMovement[] = [
  {
    id: "SM-001",
    productId: "1",
    productName: "Wireless Headphones",
    type: "purchase",
    quantity: 50,
    date: "2024-12-10T08:00:00",
    userId: "00000000-0000-0000-0000-000000000002",
    notes: "PO-001 received",
  },
  {
    id: "SM-002",
    productId: "1",
    productName: "Wireless Headphones",
    type: "sale",
    quantity: -1,
    date: "2024-12-15T10:30:00",
    userId: "00000000-0000-0000-0000-000000000003",
  },
  {
    id: "SM-003",
    productId: "4",
    productName: "Cotton T-Shirt",
    type: "purchase",
    quantity: 100,
    date: "2024-12-12T09:00:00",
    userId: "00000000-0000-0000-0000-000000000002",
    notes: "PO-002 received",
  },
  {
    id: "SM-004",
    productId: "4",
    productName: "Cotton T-Shirt",
    type: "sale",
    quantity: -2,
    date: "2024-12-15T10:30:00",
    userId: "00000000-0000-0000-0000-000000000003",
  },
  {
    id: "SM-005",
    productId: "3",
    productName: "Phone Case",
    type: "adjustment",
    quantity: -5,
    date: "2024-12-13T14:00:00",
    userId: "00000000-0000-0000-0000-000000000001",
    notes: "Damaged stock write-off",
  },
  {
    id: "SM-006",
    productId: "6",
    productName: "Sneakers",
    type: "sale",
    quantity: -1,
    date: "2024-12-15T11:45:00",
    userId: "00000000-0000-0000-0000-000000000003",
  },
]

export const mockCreditRecords: CreditRecord[] = [
  {
    id: "CR-001",
    clientId: "1",
    transactionId: "TXN-003",
    amount: 234.95,
    paidAmount: 0,
    dueDate: "2025-01-15",
    status: "pending",
    payments: [],
  },
  {
    id: "CR-002",
    clientId: "3",
    transactionId: "TXN-005",
    amount: 127.96,
    paidAmount: 50.0,
    dueDate: "2025-01-14",
    status: "partial",
    payments: [{ id: "PAY-001", amount: 50.0, date: "2024-12-16", method: "cash" }],
  },
  {
    id: "CR-003",
    clientId: "1",
    transactionId: "TXN-OLD",
    amount: 500.0,
    paidAmount: 500.0,
    dueDate: "2024-12-01",
    status: "paid",
    payments: [
      { id: "PAY-002", amount: 250.0, date: "2024-11-25", method: "cash" },
      { id: "PAY-003", amount: 250.0, date: "2024-12-01", method: "card" },
    ],
  },
  {
    id: "CR-004",
    clientId: "4",
    transactionId: "TXN-OLD2",
    amount: 450.0,
    paidAmount: 0,
    dueDate: "2024-11-30",
    status: "overdue",
    payments: [],
  },
]

export const mockStoreSettings: StoreSettings = {
  name: "SmartPOS Store",
  address: "123 Main Street, Downtown, NY 10001",
  phone: "+1 555-0000",
  email: "info@smartpos.com",
  taxRate: 8.5,
  currency: "Fbu",
  currencySymbol: "Fbu",
  rcNumber: "",
  nifNumber: "",
}

// Helper functions
export function getProductById(id: string): Product | undefined {
  return mockProducts.find((p) => p.id === id)
}

export function getClientById(id: string): Client | undefined {
  return mockClients.find((c) => c.id === id)
}

export function getSupplierById(id: string): Supplier | undefined {
  return mockSuppliers.find((s) => s.id === id)
}

export function getUserById(id: string): User | undefined {
  return mockUsers.find((u) => u.id === id)
}

export function formatCurrency(
  value: number | string | null | undefined,
  options: {
    decimals?: number;
    fallback?: string;
    symbol?: string;
  } = {}
): string {
  const { decimals = 0, fallback = '0', symbol } = options;
  const currencySymbol = symbol ?? mockStoreSettings.currencySymbol;

  if (value == null || value === '') {
    return `${fallback} ${currencySymbol}`;
  }

  const num = typeof value === 'string' ? Number(value) : value;

  if (isNaN(num) || !isFinite(num)) {
    return `${fallback} ${currencySymbol}`;
  }

  return `${num.toFixed(decimals)} ${currencySymbol}`;
}

export function getStockStatus(product: Product): "in-stock" | "low" | "out" {
  if (product.stock === 0) return "out"
  if (product.stock <= product.minStock) return "low"
  return "in-stock"
}

// Dashboard statistics
export function getDashboardStats() {
  const today = new Date().toISOString().split("T")[0]
  const todayTransactions = mockTransactions.filter((t) => t.date.startsWith(today) && t.status === "completed")
  const todaySales = todayTransactions.reduce((sum, t) => sum + t.total, 0)

  const monthStart = new Date()
  monthStart.setDate(1)
  const monthTransactions = mockTransactions.filter((t) => new Date(t.date) >= monthStart && t.status === "completed")
  const monthlyRevenue = monthTransactions.reduce((sum, t) => sum + t.total, 0)

  const totalCreditBalance = mockClients.reduce((sum, c) => sum + c.creditBalance, 0)

  const lowStockItems = mockProducts.filter((p) => p.stock <= p.minStock).length

  return {
    todaySales,
    monthlyRevenue,
    totalCreditBalance,
    lowStockItems,
  }
}
