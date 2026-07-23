"use client"

import { useState, useMemo, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useSettings } from "@/hooks/use-settings"
import { useUsers } from "@/hooks/use-users"
import { useTables } from "@/hooks/use-tables"
import { useOrders } from "@/hooks/use-orders"
import { useCart } from "@/lib/cart-context"
import { useLocations } from "@/hooks/use-locations"
import { useStock } from "@/hooks/use-stock"
import { useUserLocations } from "@/hooks/use-user-locations"
import { Button } from "@/components/ui/button"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { ProductGrid } from "@/components/pos/product-grid"
import { CartPanel } from "@/components/pos/cart-panel"
import { toast } from "sonner"
import { Table2, User, Utensils, ShoppingBag, Wine, AlertCircle } from "lucide-react"
import { printThermal } from "@/lib/thermal-print"

function StockLoader() {
  const { locations } = useLocations()
  const { user } = useAuth()
  const { userLocations } = useUserLocations(user?.id)

  const isCashier = user?.role === "cashier"

  // For cashiers: ONLY load stock from their single assigned location
  // For managers/admins: load from store and primary locations as usual
  const getRelevantLocations = () => {
    if (isCashier) {
      if (userLocations.length === 0) return { store: null, principal: null }
      // Cashier can only see their assigned location - no other locations
      const assignedLoc = userLocations[0]?.location
      return {
        store: assignedLoc?.type === "store" ? assignedLoc : null,
        principal: assignedLoc?.type === "primary" ? assignedLoc : null,
      }
    }
    // Managers/admins see both store and primary
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
  const { users } = useUsers()
  const { tables } = useTables()
  const { createOrder } = useOrders()
  const { items, selectedClient, total, clearCart } = useCart()
  const { locations } = useLocations()
  const { userLocations } = useUserLocations(user?.id)

  const [orderMode, setOrderMode] = useState<"dinein" | "counter" | "takeaway">("dinein")
  const [selectedTableId, setSelectedTableId] = useState<string>("")
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>("")
  const [creating, setCreating] = useState(false)
  const [showValidation, setShowValidation] = useState(false)

  const isCashier = user?.role === "cashier"

  const availableLocations = useMemo(() => {
    const active = locations.filter((l) => l.isActive)
    if (!isCashier) return active
    if (userLocations.length === 0) return []
    return active.filter((l) => userLocations.some((ul) => ul.locationId === l.id))
  }, [locations, userLocations, isCashier])

  const activeLocations = useMemo(() => availableLocations, [availableLocations])

  const waiters = useMemo(() => users.filter((u) => u.role === "waiter"), [users])
  const freeTables = useMemo(() => tables.filter((t) => t.status === "free"), [tables])

  const proceedOrder = async () => {
    if (!user || items.length === 0 || activeLocations.length === 0) return
    setCreating(true)
    try {
      const order = await createOrder({
        items: items.map((item) => ({
          productId: item.id,
          productName: item.sellingUnitName ? `${item.name} (${item.sellingUnitName})` : item.name,
          quantity: item.quantity,
          price: item.price,
          discount: item.discount,
          sellingUnitId: item.sellingUnitId || null,
        })),
        userId: user.id,
        waiterId: selectedWaiterId || user.id,
        tableId: orderMode === "dinein" ? (selectedTableId || undefined) : undefined,
        locationId: activeLocations[0]?.id,
        clientId: selectedClient?.id,
      })
      clearCart()
      setSelectedTableId("")
      setSelectedWaiterId("")

      const billItems = items.map((item) => ({
        name: item.sellingUnitName ? `${item.name} (${item.sellingUnitName})` : item.name,
        quantity: item.quantity,
        price: Number(item.price),
        total: Number(item.price) * item.quantity,
      }))
      printThermal({
        header: {
          name: settings?.name || "SmartPOS",
          address: settings?.address || "",
          phone: settings?.phone || "",
          rcNumber: settings?.rcNumber || "",
          nifNumber: settings?.nifNumber || "",
        },
        orderId: order.id,
        date: new Date(),
        waiter: selectedWaiterId ? users.find((u) => u.id === selectedWaiterId)?.name : user.name,
        table:
          orderMode === "dinein" && selectedTableId
            ? `T${tables.find((t) => t.id === selectedTableId)?.number || ""}`
            : orderMode === "counter"
            ? "Counter"
            : undefined,
        items: billItems,
        total: total,
        currencySymbol:
          ({ USD: "$", EUR: "€", GBP: "£", Fbu: "Fbu " } as Record<string, string>)[
            settings?.currency
          ] || settings?.currencySymbol || "Fbu",
        billReference: order.reference || "BL-" + order.id.slice(0, 8).toUpperCase(),
      })

      window.dispatchEvent(new CustomEvent("pos:transaction-completed"))
      toast.success("Commande créée ! Facture imprimée.")
    } catch (err: any) {
      toast.error(err.message || "Échec de la création de la commande")
    } finally {
      setCreating(false)
    }
  }

  const handleCreateOrder = async () => {
    if (!user || items.length === 0 || activeLocations.length === 0) {
      setShowValidation(true)
      return
    }

    if (orderMode === "dinein" && !selectedTableId) {
      setShowValidation(true)
      return
    }

    if (!selectedWaiterId) {
      setShowValidation(true)
      return
    }

    await proceedOrder()
  }

  if (isCashier && activeLocations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">Pas d'emplacement assigné</h2>
          <p className="text-muted-foreground">
            Veuillez contacter un administrateur pour être assigné à un emplacement de vente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <StockLoader />
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 shrink-0 overflow-x-auto">
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {(["dinein", "counter", "takeaway"] as const).map((mode) => (
            <Button
              key={mode}
              variant={orderMode === mode ? "default" : "ghost"}
              size="sm"
              onClick={() => setOrderMode(mode)}
              className="rounded-none h-8"
            >
              {mode === "dinein" && <Utensils className="h-3.5 w-3.5 mr-1" />}
              {mode === "counter" && <Wine className="h-3.5 w-3.5 mr-1" />}
              {mode === "takeaway" && <ShoppingBag className="h-3.5 w-3.5 mr-1" />}
              {mode === "dinein" ? "Sur place" : mode === "counter" ? "Comptoir" : "À emporter"}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
          {orderMode === "dinein" ? (
            <Select value={selectedTableId} onValueChange={setSelectedTableId}>
              <SelectTrigger className="w-28 h-8">
                <SelectValue placeholder="Table" />
              </SelectTrigger>
              <SelectContent>
                {freeTables.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Aucune table libre
                  </SelectItem>
                ) : (
                  freeTables.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      T{t.number} ({t.capacity}p)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          ) : orderMode === "counter" ? (
            <span className="text-xs font-medium text-muted-foreground">Comptoir</span>
          ) : (
            <span className="text-xs text-muted-foreground">À emporter</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={selectedWaiterId} onValueChange={setSelectedWaiterId}>
            <SelectTrigger className="w-32 h-8">
              <SelectValue placeholder="Serveur" />
            </SelectTrigger>
            <SelectContent>
              {waiters.map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  {w.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-1 gap-1 p-1 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <ProductGrid />
        </div>
        <div className="w-[420px] flex flex-col overflow-hidden shrink-0">
          <CartPanel orderMode={orderMode} onCreateOrder={handleCreateOrder} creatingOrder={creating} />
        </div>
      </div>

      <Dialog open={showValidation} onOpenChange={setShowValidation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Détails de la commande
            </DialogTitle>
            <DialogDescription>Sélectionnez les champs requis pour continuer</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {orderMode === "dinein" && (
              <div className="space-y-2">
                <Label>Table</Label>
                <Select value={selectedTableId} onValueChange={setSelectedTableId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez une table" />
                  </SelectTrigger>
                  <SelectContent>
                    {freeTables.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Aucune table libre
                      </SelectItem>
                    ) : (
                      freeTables.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          T{t.number} ({t.capacity}p)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Serveur</Label>
              <Select value={selectedWaiterId} onValueChange={setSelectedWaiterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionnez un serveur" />
                </SelectTrigger>
                <SelectContent>
                  {waiters.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Aucun serveur disponible
                    </SelectItem>
                  ) : (
                    waiters.map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidation(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => {
                setShowValidation(false)
                proceedOrder()
              }}
              disabled={(orderMode === "dinein" && !selectedTableId) || !selectedWaiterId}
            >
              Confirmer et créer la commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
