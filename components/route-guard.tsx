"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

interface RouteGuardProps {
  children: React.ReactNode
  allowedRoles?: string[]
  redirectTo?: string
}

const routePermissions: Record<string, string[]> = {
  "/dashboard": ["admin", "manager", "cashier", "stock_manager"],
  "/sales": ["admin", "manager", "cashier"],
  "/sales-history": ["admin", "manager", "cashier"],
  "/purchases": ["admin", "manager", "stock_manager"],
  "/products": ["admin", "manager", "cashier", "stock_manager"],
  "/inventory": ["admin", "manager", "cashier", "stock_manager"],
  "/inventory/adjustments": ["admin", "manager", "stock_manager"],
  "/inventory/count": ["admin", "manager", "stock_manager"],
  "/stock-movements": ["admin", "manager", "stock_manager"],
  "/stock/transfers": ["admin", "manager", "stock_manager", "cashier"],
  "/caisse": ["admin", "manager", "cashier"],
  "/expenses": ["admin", "manager", "stock_manager", "cashier"],
  "/staff-tables": ["admin", "manager"],
  "/clients": ["admin", "manager", "cashier"],
  "/credit": ["admin", "manager", "cashier"],
  "/finance": ["admin", "manager"],
  "/finance/cuisine": ["admin", "manager"],
  "/finance/reports": ["admin", "manager"],
  "/finance/expenses": ["admin", "manager"],
  "/finance/payments": ["admin", "manager"],
  "/reports": ["admin", "manager", "cashier"],
  "/settings": ["admin"],
  "/notifications": ["admin", "manager", "cashier", "stock_manager"],
  "/suppliers": ["admin", "manager", "stock_manager"],
  "/users": ["admin"],
  "/profile": ["admin", "manager", "cashier", "waiter", "chef"],
  "/bakery": ["admin", "manager", "cashier"],
  "/orders": ["admin", "manager", "waiter"],
  "/stock": ["admin", "manager", "stock_manager"],
  "/locations": ["admin", "manager"],
  "/tables": ["admin", "manager", "waiter"],
}

export function RouteGuard({ children, allowedRoles, redirectTo = "/forbidden" }: RouteGuardProps) {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated) {
      router.push("/")
      return
    }

    const roles = allowedRoles || routePermissions[pathname]

    if (roles && user && !roles.includes(user.role)) {
      router.push(redirectTo)
    }
  }, [loading, isAuthenticated, user, pathname, allowedRoles, redirectTo, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) return null

  const roles = allowedRoles || routePermissions[pathname]
  if (roles && user && !roles.includes(user.role)) return null

  return <>{children}</>
}
