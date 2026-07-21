"use client"

import { useState, useMemo, useEffect } from "react"
import { ProductGrid } from "@/components/pos/product-grid"
import { CartPanel } from "@/components/pos/cart-panel"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useUsers } from "@/hooks/use-users"
import { useTables } from "@/hooks/use-tables"
import { useOrders } from "@/hooks/use-orders"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { useSettings } from "@/hooks/use-settings"
import { useLocations } from "@/hooks/use-locations"
import { useStock } from "@/hooks/use-stock"
import { toast } from "sonner"
import { Table2, User, Utensils, ShoppingBag, Wine, AlertCircle } from "lucide-react"
import { printThermal } from "@/lib/thermal-print"

function StockLoader() {
  const { locations } = useLocations()
  const barLocation = useMemo(() => locations.find(l => l.type === "bar"), [locations])
  const principalLocation = useMemo(() => locations.find(l => l.type === "principal"), [locations])
  const barId = barLocation?.id
  const principalId = principalLocation?.id

  const { stockItems, refresh: refreshBar } = useStock(barId, !!barId)
  const { stockItems: principalStock, refresh: refreshPrincipal } = useStock(principalId, !!principalId)
  const { setProductStocks, setPrincipalStocks } = useCart()

  useEffect(() => {
    if (!barId) return
    const map: Record<string, number> = {}
    for (const si of stockItems) {
      map[si.productId] = Number(si.quantityOnHand)
    }
    setProductStocks(map)
  }, [stockItems, setProductStocks, barId])

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
      refreshBar()
      refreshPrincipal()
    }
    window.addEventListener("pos:transaction-completed", onTransactionCompleted)
    return () => window.removeEventListener("pos:transaction-completed", onTransactionCompleted)
  }, [refreshBar, refreshPrincipal])

  return null
}

export default function SalesPage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { users } = useUsers()
  const { tables } = useTables()
  const { createOrder } = useOrders()
  const { items, selectedClient, total, clearCart } = useCart()

  const [orderMode, setOrderMode] = useState<"dinein" | "counter" | "takeaway">("dinein")
  const [selectedTableId, setSelectedTableId] = useState<string>("")
  const [selectedWaiterId, setSelectedWaiterId] = useState<string>("")
  const [creating, setCreating] = useState(false)
  const [showValidation, setShowValidation] = useState(false)

  const waiters = useMemo(() => users.filter((u) => u.role === "waiter"), [users])
  const freeTables = useMemo(() => tables.filter((t) => t.status === "free"), [tables])

  const handleCreateOrder = async () => {
    if (!user || items.length === 0) return

    if ((orderMode === "dinein" && !selectedTableId) || (orderMode !== "dinein" && !selectedWaiterId)) {
      setShowValidation(true)
      return
    }

    await proceedOrder()
  }

  const resetSelections = () => {
    setSelectedTableId("")
    setSelectedWaiterId("")
  }

  const proceedOrder = async () => {
    if (!user || items.length === 0) return
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
        clientId: selectedClient?.id,
      })
      clearCart()
      resetSelections()

      // Print bill
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
        table: orderMode === "dinein" && selectedTableId
          ? `T${tables.find((t) => t.id === selectedTableId)?.number || ""}`
          : orderMode === "counter"
            ? "Counter"
            : undefined,
        items: billItems,
        total: total,
        currencySymbol: ({ USD: "$", EUR: "€", GBP: "£", Fbu: "Fbu " } as Record<string, string>)[settings?.currency] || settings?.currencySymbol || "Fbu",
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

  return (
    <div className="flex h-full flex-col bg-background">
      <StockLoader />
      {/* Compact toolbar */}
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
                   <SelectItem value="none" disabled>Aucune table libre</SelectItem>
                ) : (
                  freeTables.map((t) => (
                    <SelectItem key={t.id} value={t.id}>T{t.number} ({t.capacity}p)</SelectItem>
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
                 <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
               ))}
             </SelectContent>
           </Select>
        </div>
      </div>

      {/* Main POS area */}
      <div className="flex flex-1 gap-1 p-1 overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden">
          <ProductGrid />
        </div>
        <div className="w-[420px] flex flex-col overflow-hidden shrink-0">
          <CartPanel
            orderMode={orderMode}
            onCreateOrder={handleCreateOrder}
            creatingOrder={creating}
          />
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
                      <SelectItem value="none" disabled>Aucune table libre</SelectItem>
                    ) : (
                      freeTables.map((t) => (
                        <SelectItem key={t.id} value={t.id}>T{t.number} ({t.capacity}p)</SelectItem>
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
                     <SelectItem value="none" disabled>Aucun serveur disponible</SelectItem>
                  ) : (
                    waiters.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowValidation(false)}>Annuler</Button>
            <Button onClick={() => { setShowValidation(false); proceedOrder() }} disabled={(orderMode === "dinein" && !selectedTableId) || !selectedWaiterId}>
              Confirmer et créer la commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
