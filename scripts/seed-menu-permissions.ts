/**
 * Script to seed menu permissions
 * Usage: npx tsx scripts/seed-menu-permissions.ts
 */

import db from "../lib/db"
import { menuPermissions } from "../lib/db/schema"

const SEED_MENU_PERMISSIONS = [
  {
    href: "/dashboard",
    label: "Tableau de bord",
    icon: "LayoutDashboard",
    roles: ["admin", "manager"],
    sortOrder: 1,
  },
  {
    href: "/sales",
    label: "Ventes (PDV)",
    icon: "ShoppingCart",
    roles: ["admin", "manager", "cashier"],
    sortOrder: 2,
  },
  {
    href: "/sales-history",
    label: "Historique des ventes",
    icon: "Receipt",
    roles: ["admin", "manager", "cashier"],
    sortOrder: 3,
  },
  {
    href: "/purchases",
    label: "Achats",
    icon: "Truck",
    roles: ["admin", "manager"],
    sortOrder: 5,
  },
  {
    href: "/products",
    label: "Products",
    icon: "Package",
    roles: ["admin", "manager"],
    sortOrder: 6,
  },
  {
    href: "/inventory",
    label: "État du stock",
    icon: "Warehouse",
    roles: ["admin", "manager", "stock_manager"],
    sortOrder: 7,
  },
  {
    href: "/inventory/adjustments",
    label: "Ajustements de stock",
    icon: "RefreshCw",
    roles: ["admin", "manager", "stock_manager"],
    sortOrder: 8,
  },
  {
    href: "/inventory/count",
    label: "Comptage d'inventaire",
    icon: "ClipboardList",
    roles: ["admin", "manager", "stock_manager"],
    sortOrder: 9,
  },
  {
    href: "/stock-movements",
    label: "Mouvements de stock",
    icon: "ArrowLeftRight",
    roles: ["admin", "manager", "stock_manager"],
    sortOrder: 10,
  },
  {
    href: "/stock/transfers",
    label: "Transfers",
    icon: "ArrowRightLeft",
    roles: ["admin", "manager"],
    sortOrder: 11,
  },
  {
    href: "/expenses",
    label: "Dépenses",
    icon: "Wallet",
    roles: ["admin", "manager"],
    sortOrder: 13,
  },
  {
    href: "/locations",
    label: "Locations",
    icon: "MapPin",
    roles: ["admin", "manager"],
    sortOrder: 14,
  },
  {
    href: "/finance",
    label: "Finance",
    icon: "Landmark",
    roles: ["admin", "manager"],
    sortOrder: 17,
  },
  {
    href: "/reports",
    label: "Rapports",
    icon: "BarChart3",
    roles: ["admin", "manager", "stock_manager"],
    sortOrder: 18,
  },
  {
    href: "/users",
    label: "Users",
    icon: "UserCog",
    roles: ["admin"],
    sortOrder: 19,
  },
  {
    href: "/settings",
    label: "Paramètres",
    icon: "Settings",
    roles: ["admin"],
    sortOrder: 20,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "Bell",
    roles: ["admin", "manager", "cashier", "stock_manager"],
    sortOrder: 111,
  },
]

async function seedMenuPermissions() {
  try {
    console.log("Seeding menu permissions...")

    // Clear existing menu permissions
    await db.delete(menuPermissions)

    // Insert menu permissions
    const result = await db.insert(menuPermissions).values(SEED_MENU_PERMISSIONS).returning()

    console.log(`✓ Successfully seeded ${result.length} menu permissions:`)
    result.forEach((perm) => {
      console.log(`  - ${perm.label} (${perm.href}) [${perm.roles.join(", ")}]`)
    })

    process.exit(0)
  } catch (error) {
    console.error("Error seeding menu permissions:", error)
    process.exit(1)
  }
}

seedMenuPermissions()
