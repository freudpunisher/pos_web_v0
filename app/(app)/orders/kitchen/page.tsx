"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { printThermal } from "@/lib/thermal-print"
import {
    Loader2, ChefHat, Clock, CheckCircle, CookingPot,
    UtensilsCrossed, Bell, RefreshCw, History, ListOrdered, Printer,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface KitchenOrder {
    id: string
    reference: string
    date: string
    orderStatus: string
    waiter?: { id: string; name: string }
    table?: { id: string; number: number }
    items: Array<{
        id: string
        productName: string
        quantity: number
    }>
}

const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    pending: { label: "En attente", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-200" },
    preparing: { label: "En préparation", icon: CookingPot, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-200" },
    ready: { label: "Prêt", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-200" },
}

export default function KitchenOrdersPage() {
    const [filter, setFilter] = useState("current")
    const [orders, setOrders] = useState<KitchenOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [updatingId, setUpdatingId] = useState<string | null>(null)

    const fetchOrders = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/orders/kitchen?filter=${filter}`)
            if (res.ok) setOrders(await res.json())
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [filter])

    useEffect(() => { fetchOrders() }, [fetchOrders])

    const updateStatus = async (id: string, orderStatus: string) => {
        setUpdatingId(id)
        try {
            const res = await fetch("/api/orders/kitchen", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, orderStatus }),
            })
            if (res.ok) {
                setOrders((prev) =>
                    prev.map((o) => (o.id === id ? { ...o, orderStatus } : o))
                )
            }
        } catch (err) {
            console.error(err)
        } finally {
            setUpdatingId(null)
        }
    }

    const handlePrintOrder = (order: KitchenOrder) => {
        const items = order.items.map((i) => ({
            name: i.productName,
            quantity: i.quantity,
            price: 0,
            total: 0,
        }))
        printThermal({
            simple: true,
            header: {
                name: "BON DE COMMANDE",
                address: order.table ? `Table T${order.table.number}` : "",
                phone: order.waiter?.name ? `Serveur: ${order.waiter.name}` : "",
            },
            orderId: order.id,
            date: new Date(order.date),
            items,
            total: 0,
            currencySymbol: "",
            billReference: order.reference,
        })
    }

    const activeOrders = orders.filter((o) => o.orderStatus === "pending" || o.orderStatus === "preparing")
    const readyOrders = orders.filter((o) => o.orderStatus === "ready")

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <ChefHat className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Commandes Cuisine</h1>
                        <p className="text-sm text-muted-foreground">
                            {filter === "current" ? `${activeOrders.length} en cours · ${readyOrders.length} prêts` : `${orders.length} commandes terminées`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {filter === "current" && activeOrders.length > 0 && (
                        <Badge variant="secondary" className="gap-1.5 text-sm px-3 py-1">
                            <Bell className="h-4 w-4 text-amber-500" />
                            {activeOrders.length} nouveau(x)
                        </Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
                        <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
                        Actualiser
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={filter} onValueChange={setFilter}>
                <TabsList>
                    <TabsTrigger value="current" className="flex items-center gap-2">
                        <ListOrdered className="h-4 w-4" /> En cours
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="h-4 w-4" /> Historique
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="current" className="space-y-6 mt-6">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: "En attente", count: orders.filter(o => o.orderStatus === "pending").length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
                            { label: "En préparation", count: orders.filter(o => o.orderStatus === "preparing").length, icon: CookingPot, color: "text-blue-500", bg: "bg-blue-500/10" },
                            { label: "Prêt", count: readyOrders.length, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                        ].map((s) => (
                            <Card key={s.label} className="border-border/50">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                                        <p className="text-2xl font-bold mt-1">{s.count}</p>
                                    </div>
                                    <div className={`h-10 w-10 rounded-full ${s.bg} flex items-center justify-center`}>
                                        <s.icon className={`h-5 w-5 ${s.color}`} />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Active Orders Grid */}
                    {loading && orders.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : orders.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="text-lg font-medium text-muted-foreground">Aucune commande cuisine</p>
                                <p className="text-sm text-muted-foreground mt-1">Les commandes des caissiers apparaîtront ici automatiquement</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {orders.map((order) => {
                                const config = statusConfig[order.orderStatus] || statusConfig.pending
                                const StatusIcon = config.icon
                                const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0)

                                return (
                                    <Card key={order.id} className={cn("border-2", config.bg)}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <StatusIcon className={cn("h-4 w-4", config.color)} />
                                                        {order.reference}
                                                    </CardTitle>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(order.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        {order.waiter && (
                                                            <>
                                                                <span>·</span>
                                                                <span>{order.waiter.name}</span>
                                                            </>
                                                        )}
                                                        {order.table && (
                                                            <>
                                                                <span>·</span>
                                                                <Badge variant="outline" className="text-xs">T{order.table.number}</Badge>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrintOrder(order)} title="Imprimer la commande">
                                                        <Printer className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Badge className={cn(
                                                        "text-xs capitalize",
                                                        order.orderStatus === "ready" ? "bg-emerald-500 text-white" :
                                                        order.orderStatus === "preparing" ? "bg-blue-500 text-white" :
                                                        "bg-amber-500 text-white"
                                                    )}>
                                                        {order.orderStatus}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="space-y-1.5">
                                                {order.items.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between text-sm bg-background/80 rounded-lg px-3 py-2">
                                                        <span className="font-medium">{item.productName}</span>
                                                        <Badge variant="secondary" className="text-xs font-mono shrink-0 ml-2">
                                                            ×{item.quantity}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{order.items.length} article(s)</span>
                                                <span>{totalQty} total</span>
                                            </div>

                                            <div className="flex gap-2 pt-1">
                                                {order.orderStatus === "pending" && (
                                                    <Button
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => updateStatus(order.id, "preparing")}
                                                        disabled={updatingId === order.id}
                                                    >
                                                        {updatingId === order.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                                        ) : (
                                                            <CookingPot className="h-4 w-4 mr-1.5" />
                                                        )}
                                                        Commencer la préparation
                                                    </Button>
                                                )}
                                                {order.orderStatus === "preparing" && (
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                                        onClick={() => updateStatus(order.id, "ready")}
                                                        disabled={updatingId === order.id}
                                                    >
                                                        {updatingId === order.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                                        ) : (
                                                            <CheckCircle className="h-4 w-4 mr-1.5" />
                                                        )}
                                                        Marquer comme prêt
                                                    </Button>
                                                )}
                                                {order.orderStatus === "ready" && (
                                                    <Badge variant="outline" className="flex-1 justify-center py-2 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20">
                                                        <CheckCircle className="h-4 w-4 mr-1.5" />
                                                        Prêt à servir
                                                    </Badge>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history" className="space-y-6 mt-6">
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">{orders.length} commande(s) terminée(s)</p>
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    </div>

                    {loading && orders.length === 0 ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : orders.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16">
                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <History className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <p className="text-lg font-medium text-muted-foreground">Aucune commande terminée</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {orders.map((order) => {
                                const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0)
                                return (
                                    <Card key={order.id} className="border-border/50">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
                                                        {order.reference}
                                                    </CardTitle>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                        <Clock className="h-3 w-3" />
                                                        {new Date(order.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                        {order.waiter && (
                                                            <>
                                                                <span>·</span>
                                                                <span>{order.waiter.name}</span>
                                                            </>
                                                        )}
                                                        {order.table && (
                                                            <>
                                                                <span>·</span>
                                                                <Badge variant="outline" className="text-xs">T{order.table.number}</Badge>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrintOrder(order)} title="Imprimer la commande">
                                                    <Printer className="h-3.5 w-3.5" />
                                                </Button>
                                                <Badge variant="secondary" className="text-xs capitalize">
                                                    {order.orderStatus}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="space-y-1.5">
                                                {order.items.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-3 py-2">
                                                        <span className="font-medium">{item.productName}</span>
                                                        <Badge variant="secondary" className="text-xs font-mono shrink-0 ml-2">
                                                            ×{item.quantity}
                                                        </Badge>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{order.items.length} article(s) · {totalQty} total</span>
                                                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
