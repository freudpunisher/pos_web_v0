"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

const routeLabels: Record<string, string> = {
  dashboard: "Tableau de bord",
  sales: "Ventes (POS)",
  "sales-history": "Historique des ventes",
  purchases: "Achats",
  products: "Produits",
  inventory: "Inventaire",
  adjustments: "Ajustements",
  count: "Comptage",
  "stock-movements": "Mouvements de stock",
  stock: "Stock",
  transfers: "Transferts",
  caisse: "Caisse",
  expenses: "Dépenses",
  clients: "Clients",
  credit: "Gestion des crédits",
  reports: "Rapports",
  finance: "Finance",
  payments: "Historique paiements",
  settings: "Paramètres",
  bakery: "Boulangerie",
  orders: "Commandes",
  suppliers: "Fournisseurs",
  "staff-tables": "Personnel & Tables",
  tables: "Tables",
  profile: "Profil",
  notifications: "Notifications",
  locations: "Emplacements",
  users: "Utilisateurs",
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) return null

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/dashboard" className="flex items-center hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {segments.map((segment, index) => {
        const href = `/${segments.slice(0, index + 1).join("/")}`
        const isLast = index === segments.length - 1
        const label = routeLabels[segment] || segment

        return (
          <div key={href} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link href={href} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
