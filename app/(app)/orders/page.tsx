"use client"

import { useState, useMemo } from "react"
import { useOrders } from "@/hooks/use-orders"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { useSettings } from "@/hooks/use-settings"
import { PaymentDialog } from "@/components/pos/payment-dialog"
import { printThermal } from "@/lib/thermal-print"
import {
  Clock, ChefHat, Bell, Utensils, CheckCircle, XCircle, Loader2,
  User, Table2, Search, CreditCard, Printer,
} from "lucide-react"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
  preparing: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  ready: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  served: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  paid: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-red-500/20 text-red-700 dark:text-red-400",
}

const statusLabels: Record<string, string> = {
  pending: "En attente",
  preparing: "En préparation",
  ready: "Prêt",
  served: "Servi",
  paid: "Payé",
  cancelled: "Annulé",
}

const statusIcons: Record<string, any> = {
  pending: Clock,
  preparing: ChefHat,
  ready: Bell,
  served: Utensils,
  paid: CheckCircle,
  cancelled: XCircle,
}

export default function OrdersPage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { orders, loading, updateOrderStatus } = useOrders()
  const [filter, setFilter] = useState<string>("active")
  const [search, setSearch] = useState("")
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; order: any | null }>({ open: false, order: null })

  const statusTabs = [
    { key: "active", label: "Actif", icon: ChefHat },
    { key: "pending", label: "En attente", icon: Clock },
    { key: "preparing", label: "En préparation", icon: ChefHat },
    { key: "ready", label: "Prêt", icon: Bell },
    { key: "served", label: "Servi", icon: Utensils },
    { key: "paid", label: "Payé", icon: CheckCircle },
    { key: "cancelled", label: "Annulé", icon: XCircle },
  ]

  const activeOrders = useMemo(() => {
    return orders.filter((o) => !["paid", "cancelled"].includes(o.orderStatus))
  }, [orders])

  const filteredOrders = useMemo(() => {
    let filtered = filter === "active" ? activeOrders : orders.filter((o) => o.orderStatus === filter)
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter((o) =>
        o.id?.toLowerCase().includes(q) ||
        o.waiter?.name?.toLowerCase().includes(q) ||
        o.table?.number?.toString().includes(q)
      )
    }
    return filtered
  }, [orders, activeOrders, filter, search])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { pending: 0, preparing: 0, ready: 0, served: 0, paid: 0, cancelled: 0 }
    orders.forEach((o) => { counts[o.orderStatus] = (counts[o.orderStatus] || 0) + 1 })
    return counts
  }, [orders])

  const handleStatus = async (id: string, status: string) => {
    try {
      await updateOrderStatus(id, { orderStatus: status })
      toast.success(`Commande : ${statusLabels[status] || status}`)
    } catch (err: any) {
      toast.error(err.message || "Échec de la mise à jour du statut")
    }
  }

  const handlePayment = async ({ paymentMethod, clientId }: { paymentMethod: "cash" | "credit"; clientId?: string }) => {
    if (!paymentDialog.order || !user) return
    try {
      await updateOrderStatus(paymentDialog.order.id, { orderStatus: "paid", paymentMethod, clientId })
      toast.success(`Paiement de ${formatCurrency(Number(paymentDialog.order.total))} reçu par ${paymentMethod}`)
      setPaymentDialog({ open: false, order: null })
    } catch (err: any) {
      toast.error(err.message || "Paiement échoué")
    }
  }

  const handlePrintBill = (order: any) => {
    const items = (order.items || []).map((item: any) => ({
      name: item.productName,
      quantity: item.quantity,
      price: Number(item.price),
      total: Number(item.price) * item.quantity,
    }))
    printThermal({
      header: {
        name: settings?.name || "SmartPOS",
        address: settings?.address || "",
        phone: settings?.phone || "",
      },
      orderId: order.id,
      date: new Date(),
      waiter: order.waiter?.name,
      table: order.table ? `T${order.table.number}` : undefined,
      items,
      total: Number(order.total),
      paymentMethod: order.paymentMethod,
      currencySymbol: ({ USD: "$", EUR: "€", GBP: "£", Fbu: "Fbu " } as Record<string, string>)[settings?.currency] || settings?.currencySymbol || "Fbu",
      billReference: order.reference || "BL-" + order.id.slice(0, 8).toUpperCase(),
    })
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Commandes</h2>
          <p className="text-muted-foreground">Gestion des commandes cuisine & bar</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher commandes, serveur, table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {statusTabs.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={filter === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(key)}
            className="shrink-0"
          >
            <Icon className="h-4 w-4 mr-1.5" />
            {label}
            <Badge variant="secondary" className="ml-1.5 text-xs px-1.5">
              {key === "active" ? activeOrders.length : statusCounts[key] || 0}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CheckCircle className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">Aucune commande {filter === "active" ? "active" : statusLabels[filter]?.toLowerCase() || filter}</p>
            <p className="text-sm">Les commandes apparaîtront ici une fois créées</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const StatusIcon = statusIcons[order.orderStatus] || Clock
            const items = order.items || []
            return (
              <Card key={order.id} className="border-border/50 hover:shadow-lg transition-all group overflow-hidden">
                <div className={`h-1 w-full ${order.orderStatus === "pending" ? "bg-amber-500" : order.orderStatus === "preparing" ? "bg-blue-500" : order.orderStatus === "ready" ? "bg-green-500" : order.orderStatus === "served" ? "bg-purple-500" : order.orderStatus === "paid" ? "bg-emerald-500" : "bg-red-500"}`} />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-sm font-mono font-bold">#{order.id.slice(0, 8)}</span>
                        {order.table && (
                          <Badge variant="outline" className="text-xs font-normal">
                            <Table2 className="h-3 w-3 mr-1" /> T{order.table.number}
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        {order.waiter && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {order.waiter.name}
                          </span>
                        )}
                        {order.table?.section && (
                          <span>{order.table.section}</span>
                        )}
                        <span>{new Date(order.createdAt || order.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                      </div>
                    </div>
                    <Badge className={statusColors[order.orderStatus]}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusLabels[order.orderStatus] || order.orderStatus}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 mb-4">
                    {items.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="truncate mr-2 flex-1">{item.quantity}x {item.productName}</span>
                        <span className="text-xs text-muted-foreground shrink-0 mr-2">
                          @{formatCurrency(Number(item.price))}
                        </span>
                        <span className="text-muted-foreground shrink-0">{formatCurrency(Number(item.price) * item.quantity)}</span>
                      </div>
                    ))}
                    {items.length > 5 && (
                      <p className="text-xs text-muted-foreground">+{items.length - 5} articles supplémentaires</p>
                    )}
                  </div>

                  <Separator className="mb-4" />

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{formatCurrency(Number(order.total))}</span>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => handlePrintBill(order)} title="Imprimer la facture">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>

                      {order.orderStatus === "pending" && (
                        <Button size="sm" onClick={() => handleStatus(order.id, "preparing")}>
                          <ChefHat className="h-3.5 w-3.5 mr-1" /> Préparer
                        </Button>
                      )}
                      {order.orderStatus === "preparing" && (
                        <Button size="sm" onClick={() => handleStatus(order.id, "ready")}>
                          <Bell className="h-3.5 w-3.5 mr-1" /> Prêt
                        </Button>
                      )}
                      {order.orderStatus === "ready" && (
                        <Button size="sm" onClick={() => handleStatus(order.id, "served")}>
                          <Utensils className="h-3.5 w-3.5 mr-1" /> Servir
                        </Button>
                      )}
                      {order.orderStatus === "served" && (
                        <Button size="sm" onClick={() => setPaymentDialog({ open: true, order })}>
                          <CreditCard className="h-3.5 w-3.5 mr-1" /> Paiement
                        </Button>
                      )}
                      {!["paid", "cancelled"].includes(order.orderStatus) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleStatus(order.id, "cancelled")}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <PaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog({ open, order: open ? paymentDialog.order : null })}
        order={paymentDialog.order}
        onPay={handlePayment}
      />
    </div>
  )
}
