"use client"

import { useEffect, useState, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useSuppliers } from "@/hooks/use-suppliers"
import { useProducts } from "@/hooks/use-products"
import { usePurchases } from "@/hooks/use-purchases"
import { useLocations } from "@/hooks/use-locations"
import { useStockTransfers } from "@/hooks/use-stock-transfers"
import { formatCurrency } from "@/lib/mock-data"
import { printReport } from "@/lib/print-report"
import {
    ArrowLeft, Loader2, Plus, Trash2, Package, ShoppingCart, XCircle,
    CheckCircle2, Printer, MapPin, Send, ArrowRight, CheckCircle, Clock,
    DollarSign, Hash, Building2, Warehouse, Store, Search, AlertTriangle
} from "lucide-react"
import Swal from "sweetalert2"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth-context"

interface POItem {
    productId: string
    productName: string
    quantity: number
    cost: number
}

const LOCATION_ICONS: Record<string, any> = {
    primary: Warehouse,
    store: Store,
    branch: MapPin,
    delivery_point: Building2,
}

export default function EditPurchaseOrderPage() {
    const router = useRouter()
    const params = useParams()
    const orderId = params.id as string

    const [order, setOrder] = useState<any | null>(null)
    const [supplierId, setSupplierId] = useState("")
    const [items, setItems] = useState<POItem[]>([])
    const [selectedProductId, setSelectedProductId] = useState("")
    const [productSearch, setProductSearch] = useState("")
    const [showProductSearch, setShowProductSearch] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isActionLoading, setIsActionLoading] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)

    const { suppliers, loading: suppliersLoading } = useSuppliers()
    const { products, loading: productsLoading } = useProducts()
    const { locations } = useLocations()
    const { createDirectTransfer } = useStockTransfers()

    const { updateOrder, cancelOrder, markAsReceived } = usePurchases()
    const { user } = useAuth()

    const [destLocationId, setDestLocationId] = useState("")
    const [transferQuantities, setTransferQuantities] = useState<Record<string, number>>({})
    const [isTransferring, setIsTransferring] = useState(false)

    const primaryLocation = locations.find((l: any) => l.type === "primary")
    const storeLocations = locations.filter((l: any) => l.type !== "primary" && l.isActive)

    const filteredProducts = useMemo(() => {
        const query = productSearch.toLowerCase()
        return products.filter((p) =>
            p.name.toLowerCase().includes(query) ||
            (p.sku && p.sku.toLowerCase().includes(query))
        )
    }, [products, productSearch])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowProductSearch(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                setIsLoading(true)
                const res = await fetch(`/api/purchase-orders/${orderId}`)
                if (!res.ok) throw new Error("Failed to load order")
                const data = await res.json()
                setOrder(data)
                setSupplierId(data.supplierId)
                setItems(data.items || [])
            } catch (err: any) {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: err.message || "Could not load purchase order",
                })
                router.push("/purchases")
            } finally {
                setIsLoading(false)
            }
        }
        if (orderId) fetchOrder()
    }, [orderId, router])

    useEffect(() => {
        if (products.length > 0 && items.length > 0) {
            const needsUpdate = items.some((item) => item.cost === undefined)
            if (needsUpdate) {
                setItems((prev) =>
                    prev.map((item) => {
                        if (item.cost !== undefined) return item
                        const qty = Number(item.quantity) || 0
                        const cost = Number(item.cost) || 0
                        return { ...item, quantity: qty, cost }
                    })
                )
            }
        }
    }, [products, items])

    useEffect(() => {
        if (order?.status === "received" && items.length > 0) {
            const qtys: Record<string, number> = {}
            items.forEach((i) => { qtys[i.productId] = Number(i.quantity) || 0 })
            setTransferQuantities(qtys)
        }
    }, [order?.status, items])

    const isEditable = order?.status === "pending"

    const addProduct = (productId: string) => {
        const product = products.find((p) => p.id === productId)
        if (!product) return
        const existing = items.find((i) => i.productId === productId)
        if (existing) {
            setItems((prev) => prev.map((i) =>
                i.productId === productId ? { ...i, quantity: (i.quantity || 0) + 1 } : i
            ))
        } else {
            setItems((prev) => [...prev, { productId: product.id, productName: product.name, quantity: 1, cost: 0 }])
        }
        setProductSearch("")
        setSelectedProductId("")
        setShowProductSearch(false)
    }

    const updateQuantity = (productId: string, newQty: number) => {
        const qty = Math.max(0, newQty)
        if (qty === 0) {
            setItems((prev) => prev.filter((i) => i.productId !== productId))
        } else {
            setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: qty } : i))
        }
    }

    const updateUnitCost = (productId: string, cost: string) => {
        const numericCost = parseFloat(cost) || 0
        setItems((prev) => prev.map((i) => i.productId === productId ? { ...i, cost: numericCost } : i))
    }

    const removeItem = (productId: string) => {
        setItems((prev) => prev.filter((i) => i.productId !== productId))
    }

    const total = items.reduce((sum, i) => sum + i.quantity * i.cost, 0)
    const totalUnits = items.reduce((sum, i) => sum + Number(i.quantity || 0), 0)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isEditable) return
        setIsSubmitting(true)
        try {
            await updateOrder(orderId, { supplierId, items, total })
            toast({ title: "Commande mise à jour", description: "Modifications enregistrées." })
            router.push("/purchases")
        } catch (err: any) {
            toast({ variant: "destructive", title: "Échec de la mise à jour", description: err.message || "Impossible d'enregistrer les modifications" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancelOrder = async () => {
        if (!confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) return
        setIsActionLoading(true)
        try {
            await cancelOrder(orderId)
            toast({ title: "Commande annulée" })
            router.push("/purchases")
        } catch (err: any) {
            toast({ variant: "destructive", title: "Échec de l'annulation", description: err.message })
        } finally {
            setIsActionLoading(false)
        }
    }

    const handleTransfer = async () => {
        if (!destLocationId || !primaryLocation || !user?.id) return
        const transferItems = Object.entries(transferQuantities)
            .filter(([, qty]) => qty > 0)
            .map(([productId, quantity]) => ({ productId, quantity }))
        if (transferItems.length === 0) {
            toast({ variant: "destructive", title: "Erreur", description: "Aucune quantité à transférer" })
            return
        }
        setIsTransferring(true)
        try {
            const destName = storeLocations.find((l: any) => l.id === destLocationId)?.name || ""
            await createDirectTransfer({
                fromLocationId: primaryLocation.id,
                toLocationId: destLocationId,
                userId: user.id,
                notes: `Distribution depuis commande ${order?.purchaseRef || orderId.slice(0, 8)}`,
                items: transferItems,
            })
            toast({ title: "Transfert effectué", description: `Stock transféré vers ${destName}` })
            setDestLocationId("")
        } catch (err: any) {
            toast({ variant: "destructive", title: "Échec du transfert", description: err.message })
        } finally {
            setIsTransferring(false)
        }
    }

    const handleReceiveOrder = async () => {
        const result = await Swal.fire({
            title: "Marquer comme reçu ?",
            text: "Les produits seront ajoutés au stock du Principal.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Oui, recevoir",
            cancelButtonText: "Annuler",
        })
        if (!result.isConfirmed) return
        setIsActionLoading(true)
        try {
            await markAsReceived(orderId, user?.id || "")
            setOrder((prev: any) => prev ? { ...prev, status: "received" } : prev)
            toast({ title: "Commande reçue", description: "Stock ajouté au Principal. Vous pouvez maintenant distribuer vers les magasins." })
        } catch (err: any) {
            toast({ variant: "destructive", title: "Échec de la réception", description: err.message })
        } finally {
            setIsActionLoading(false)
        }
    }

    const handlePrint = () => {
        const origin = window.location.origin
        const supplierName = suppliers.find((s) => s.id === supplierId)?.name || "—"
        printReport({
            title: "BON D'APPROVISIONNEMENT",
            subtitle: order?.purchaseRef || `Commande #${orderId.slice(0, 8)}`,
            period: new Date(order?.date).toLocaleDateString(),
            logoUrl: `${origin}/ahava.png`,
            metrics: [
                { label: "Fournisseur", value: supplierName },
                { label: "Statut", value: order?.status === "pending" ? "En attente" : order?.status === "received" ? "Reçu" : "Annulé" },
                { label: "Produits", value: String(items.length), highlight: true },
                { label: "Total", value: formatCurrency(total), highlight: true },
            ],
            columns: [
                { header: "Produit", key: "product" },
                { header: "Quantité", key: "quantity", align: "center" },
                { header: "Prix unit.", key: "unitPrice", format: "currency", align: "right" },
                { header: "Total", key: "total", format: "currency", align: "right" },
            ],
            rows: items.map((i) => ({
                product: i.productName,
                quantity: `${i.quantity}`,
                unitPrice: i.cost,
                total: i.quantity * i.cost,
            })),
        })
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "received":
                return { label: "Reçu", color: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", icon: Package }
            case "pending":
                return { label: "En attente", color: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", icon: Clock }
            case "cancelled":
                return { label: "Annulé", color: "text-red-700 dark:text-red-400", border: "border-red-500/30", bg: "bg-red-500/10", icon: XCircle }
            default:
                return { label: status, color: "text-muted-foreground", border: "border-border", bg: "bg-muted", icon: Package }
        }
    }

    if (isLoading || suppliersLoading || productsLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Chargement de la commande...</p>
                </div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center">
                        <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground">Commande non trouvée</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const statusConfig = getStatusConfig(order.status)
    const StatusIcon = statusConfig.icon

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/purchases")} className="h-9 w-9">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">
                            {isEditable ? "Modifier la commande" : "Détails de la commande"}
                        </h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="font-mono">{order.purchaseRef || orderId.slice(0, 8)}</span>
                            <span>·</span>
                            <Badge variant="outline" className={`text-xs gap-1 py-0.5 ${statusConfig.color} ${statusConfig.border} ${statusConfig.bg}`}>
                                <StatusIcon className="h-3 w-3" /> {statusConfig.label}
                            </Badge>
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1.5" /> Imprimer
                </Button>
            </div>

            {/* Summary Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent">
                <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valeur totale</p>
                            <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
                            <p className="text-xs text-muted-foreground">
                                {suppliers.find((s) => s.id === supplierId)?.name || "Fournisseur inconnu"}
                            </p>
                        </div>
                        <div className="flex gap-6">
                            <div className="text-right">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Produits</p>
                                <p className="text-xl font-bold">{items.length}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unités</p>
                                <p className="text-xl font-bold">{totalUnits}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Supplier */}
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                            Fournisseur
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isEditable ? (
                            <Select value={supplierId} onValueChange={setSupplierId} required>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Sélectionner un fournisseur" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.filter((s) => s.isActive).map((s) => (
                                        <SelectItem key={s.id} value={s.id}>
                                            <div className="flex items-center gap-2">
                                                <span>{s.name}</span>
                                                {s.phone && <span className="text-xs text-muted-foreground">· {s.phone}</span>}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-3 h-10 px-3 rounded-md border bg-muted/30">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{suppliers.find((s) => s.id === supplierId)?.name || "Inconnu"}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Items */}
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    Produits / Articles
                                </CardTitle>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                                <Hash className="h-3 w-3 mr-0.5" /> {items.length}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Product search (editable mode) */}
                        {isEditable && (
                            <div className="relative" ref={searchRef}>
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Rechercher un produit par nom ou SKU..."
                                    value={productSearch}
                                    onChange={(e) => { setProductSearch(e.target.value); setShowProductSearch(true) }}
                                    onFocus={() => setShowProductSearch(true)}
                                    className="pl-10 h-10"
                                />
                                {showProductSearch && productSearch && (
                                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg max-h-60 overflow-y-auto">
                                        {filteredProducts.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-muted-foreground">Aucun produit trouvé</div>
                                        ) : (
                                            filteredProducts.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 border-b border-border/50 last:border-0"
                                                    onClick={() => addProduct(p.id)}
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                            <Package className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium truncate">{p.name}</p>
                                                            {p.sku && <p className="text-xs text-muted-foreground font-mono">{p.sku}</p>}
                                                        </div>
                                                    </div>
                                                    <Badge variant="secondary" className="text-xs shrink-0">
                                                        <Plus className="h-3 w-3 mr-0.5" /> Ajouter
                                                    </Badge>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Items */}
                        {items.length > 0 ? (
                            isEditable ? (
                                /* Editable: card-based layout */
                                <div className="space-y-2">
                                    {items.map((item) => (
                                        <div key={item.productId} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors">
                                            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                <Package className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{item.productName}</p>
                                                <p className="text-xs text-muted-foreground">Sous-total : {formatCurrency(item.quantity * item.cost)}</p>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] text-muted-foreground">Coût unitaire</Label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={item.cost}
                                                            onChange={(e) => updateUnitCost(item.productId, e.target.value)}
                                                            className="w-24 text-right h-8 pl-6"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] text-muted-foreground">Quantité</Label>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={item.quantity}
                                                        onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
                                                        className="w-20 text-center h-8"
                                                    />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive/90 shrink-0"
                                                    onClick={() => removeItem(item.productId)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                /* View mode: table */
                                <div className="rounded-lg border border-border/50 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produit</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Coût unit.</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center">Quantité</TableHead>
                                                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Sous-total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item) => (
                                                <TableRow key={item.productId} className="border-border/50">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                                                <Package className="h-3.5 w-3.5 text-primary" />
                                                            </div>
                                                            <span className="text-sm font-medium">{item.productName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm">{formatCurrency(item.cost)}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="text-xs">{item.quantity} unités</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(item.quantity * item.cost)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 border-2 border-dashed rounded-xl text-muted-foreground">
                                <Package className="h-10 w-10 mb-3 opacity-30" />
                                <p className="text-sm font-medium">Aucun article dans cette commande</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Actions (editable mode) */}
                {isEditable && (
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button type="button" variant="outline" onClick={() => router.push("/purchases")} className="sm:w-auto">
                            Annuler
                        </Button>
                        <div className="flex-1" />
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleCancelOrder}
                            disabled={isActionLoading}
                            className="gap-2"
                        >
                            {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            <XCircle className="h-4 w-4" />
                            Annuler la commande
                        </Button>
                        <Button
                            type="button"
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleReceiveOrder}
                            disabled={isActionLoading}
                        >
                            {isActionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            <CheckCircle2 className="h-4 w-4" />
                            Marquer comme reçu
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !supplierId || items.length === 0}
                            className="gap-2"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Enregistrer
                        </Button>
                    </div>
                )}

                {/* Status (non-editable) */}
                {!isEditable && (
                    <div className="flex justify-center pt-2">
                        <Badge variant="outline" className={`text-sm px-4 py-1.5 gap-1.5 ${statusConfig.color} ${statusConfig.border} ${statusConfig.bg}`}>
                            <StatusIcon className="h-4 w-4" />
                            {order.status === "received" ? "Commande déjà reçue" : "Commande annulée"}
                        </Badge>
                    </div>
                )}
            </form>

            {/* Transfer Panel — shown after receiving */}
            {order?.status === "received" && primaryLocation && (
                <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Send className="h-4 w-4 text-emerald-600" />
                            Distribution depuis le Principal
                        </CardTitle>
                        <CardDescription>
                            Les produits de cette commande sont disponibles au <strong>{primaryLocation.name}</strong>.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Destination */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Magasin de destination</Label>
                            <Select value={destLocationId} onValueChange={setDestLocationId}>
                                <SelectTrigger className="h-10 max-w-md">
                                    <SelectValue placeholder="Choisir un magasin..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {storeLocations.map((l: any) => {
                                        const Icon = LOCATION_ICONS[l.type] || Store
                                        return (
                                            <SelectItem key={l.id} value={l.id}>
                                                <div className="flex items-center gap-2"><Icon className="h-4 w-4" /> {l.name}</div>
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Items to transfer */}
                        {items.length > 0 && (
                            <div className="space-y-2">
                                {items.map((item) => (
                                    <div key={item.productId} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                            <Package className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.productName}</p>
                                            <p className="text-xs text-muted-foreground">Reçu : {item.quantity} unités</p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Input
                                                type="number"
                                                min="0"
                                                max={Number(item.quantity)}
                                                value={transferQuantities[item.productId] || 0}
                                                onChange={(e) => setTransferQuantities((prev) => ({
                                                    ...prev,
                                                    [item.productId]: Math.min(Number(e.target.value) || 0, Number(item.quantity)),
                                                }))}
                                                className="w-20 text-center h-8"
                                            />
                                            <span className="text-xs text-muted-foreground">/ {item.quantity}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleTransfer}
                                disabled={isTransferring || !destLocationId || Object.values(transferQuantities).every((q) => q === 0)}
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                            >
                                {isTransferring ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ArrowRight className="h-4 w-4" />
                                )}
                                Transférer vers le magasin
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
