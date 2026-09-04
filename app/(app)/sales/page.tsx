"use client"

import { useState, useMemo, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useSettings } from "@/hooks/use-settings"
import { useCart } from "@/lib/cart-context"
import { useLocations } from "@/hooks/use-locations"
import { useStock } from "@/hooks/use-stock"
import { useUserLocations } from "@/hooks/use-user-locations"
import { ProductGrid } from "@/components/pos/product-grid"
import { CartPanel } from "@/components/pos/cart-panel"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, MapPin, User } from "lucide-react"

function StockLoader() {
  const { locations } = useLocations()
  const { user } = useAuth()
  const { userLocations } = useUserLocations(user?.id)

  const isCashier = user?.role === "cashier"

  const getRelevantLocations = () => {
    if (isCashier) {
      if (userLocations.length === 0) return { store: null, principal: null }
      const assignedLoc = userLocations[0]?.location
      return {
        store: assignedLoc?.type === "store" ? assignedLoc : null,
        principal: assignedLoc?.type === "primary" ? assignedLoc : null,
      }
    }
    return {
      store: locations.find((l) => l.type === "store"),
      principal: locations.find((l) => l.type === "primary"),
    }
  }

  const { store: storeLocation, principal: principalLocation } = getRelevantLocations()
  const storeId = storeLocation?.id
  const principalId = principalLocation?.id

  const { stockItems, refresh: refreshStore } = useStock(storeId, !!storeId)
  const { stockItems: principalStock, refresh: refreshPrincipal } = useStock(principalId, !!principalId)
  const { setProductStocks, setPrincipalStocks } = useCart()

  useEffect(() => {
    if (!storeId) return
    const map: Record<string, number> = {}
    for (const si of stockItems) {
      map[si.productId] = Number(si.quantityOnHand)
    }
    setProductStocks(map)
  }, [stockItems, setProductStocks, storeId])

  useEffect(() => {
    if (!principalId) return
    const map: Record<string, number> = {}
    for (const si of principalStock) {
      map[si.productId] = Number(si.quantityOnHand)
    }
    setPrincipalStocks(map)
  }, [principalStock, setPrincipalStocks, principalId])

  useEffect(() => {
    const onTransactionCompleted = () => {
      refreshStore()
      refreshPrincipal()
    }
    window.addEventListener("pos:transaction-completed", onTransactionCompleted)
    return () => window.removeEventListener("pos:transaction-completed", onTransactionCompleted)
  }, [refreshStore, refreshPrincipal])

  return null
}

export default function SalesPage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { locations } = useLocations()
  const { userLocations } = useUserLocations(user?.id)

  const isCashier = user?.role === "cashier"

  const currentLocation = useMemo(() => {
    if (isCashier) {
      if (userLocations.length === 0) return null
      return userLocations[0]?.location || null
    }
    return locations.find((l) => l.type === "store") || locations.find((l) => l.type === "primary") || null
  }, [locations, userLocations, isCashier])

  const currencySymbol = useMemo(() => {
    const map: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", FC: "FC " }
    return map[settings?.currency || ""] || settings?.currencySymbol || "FC"
  }, [settings])

  if (isCashier && !currentLocation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-lg font-semibold">Pas d&apos;emplacement assigné</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Contactez un administrateur pour être assigné à un emplacement de vente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <StockLoader />

      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <MapPin className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{currentLocation?.name || "Point de vente"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentLocation?.type === "primary" ? "Entrepôt principal" : "Magasin"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs font-normal gap-1.5">
            <User className="h-3 w-3" />
            {user?.name}
          </Badge>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-1 p-1 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <ProductGrid />
        </div>
        <div className="w-[400px] flex flex-col overflow-hidden shrink-0">
          <CartPanel locationId={currentLocation?.id} />
        </div>
      </div>
    </div>
  )
}
