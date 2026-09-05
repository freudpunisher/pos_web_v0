"use client"

const uuid = () =>
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
    })

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLocations } from "@/hooks/use-locations"
import { useStockTransfers } from "@/hooks/use-stock-transfers"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    ArrowRightLeft, Loader2, Plus, Trash2,
    Warehouse, Store, MapPin, FileText, Send, AlertCircle,
    ChevronLeft, Building2, ArrowRight, Package, CheckCircle2, AlertTriangle
} from "lucide-react"

interface LineItem {
    key: string
    productId: string
    quantity: number
}

const LOCATION_ICONS: Record<string, any> = {
    primary: Warehouse,
    store: Store,
    branch: MapPin,
    delivery_point: Building2,
}

export default function NewTransferPage() {
    const router = useRouter()
    const { locations } = useLocations()
    const { user } = useAuth()
    const { createDirectTransfer } = useStockTransfers()
    const [submitting, setSubmitting] = useState(false)

    const [fromLocationId, setFromLocationId] = useState("")
    const [toLocationId, setToLocationId] = useState("")
    const [notes, setNotes] = useState("")
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { key: uuid(), productId: "", quantity: 0 },
    ])
    const [stockByLocation, setStockByLocation] = useState<any[]>([])
    const [loadingStock, setLoadingStock] = useState(false)

    useEffect(() => {
        if (!fromLocationId) { setStockByLocation([]); return }
        setLoadingStock(true)
        fetch(`/api/stock?locationId=${fromLocationId}`)
            .then((r) => r.json())
            .then(setStockByLocation)
            .catch(() => setStockByLocation([]))
            .finally(() => setLoadingStock(false))
    }, [fromLocationId])

    const availableProducts = useMemo(() =>
        stockByLocation
            .filter((s: any) => s.quantityOnHand > 0)
            .map((s: any) => ({ ...s.product, availableQty: s.quantityOnHand })),
        [stockByLocation]
    )

    const getProductsForLine = (currentKey: string) => {
        const selectedIds = new Set(lineItems.filter((i) => i.key !== currentKey && i.productId).map((i) => i.productId))
        return availableProducts.filter((p) => !selectedIds.has(p.id))
    }

    const getProductQty = (pid: string) => stockByLocation.find((s: any) => s.productId === pid)?.quantityOnHand ?? 0

    const getItemError = (item: LineItem): string | null => {
        if (!item.productId || item.quantity < 1) return null
        const avail = getProductQty(item.productId)
        return item.quantity > avail ? `Seulement ${avail} disponible(s)` : null
    }

    const totalRequestedByProduct = useMemo(() => {
        const map = new Map<string, number>()
        for (const item of lineItems) {
            if (item.productId && item.quantity > 0) {
                map.set(item.productId, (map.get(item.productId) || 0) + item.quantity)
            }
        }
        return map
    }, [lineItems])

    const canSubmit = useMemo(() => {
        if (!fromLocationId || !toLocationId) return false
        if (!lineItems.some((i) => i.productId && i.quantity > 0)) return false
        for (const item of lineItems) if (getItemError(item)) return false
        for (const [pid, total] of totalRequestedByProduct) if (total > getProductQty(pid)) return false
        return true
    }, [fromLocationId, toLocationId, lineItems, totalRequestedByProduct])

    const activeLocations = useMemo(() => locations.filter((l: any) => l.isActive), [locations])
    const destinationLocations = useMemo(
        () => activeLocations.filter((l: any) => l.id !== fromLocationId),
        [activeLocations, fromLocationId]
    )

    const fromLocation = activeLocations.find((l: any) => l.id === fromLocationId)
    const toLocation = activeLocations.find((l: any) => l.id === toLocationId)
    const FromIcon = LOCATION_ICONS[fromLocation?.type] || Warehouse
    const ToIcon = LOCATION_ICONS[toLocation?.type] || Store

    const addLineItem = () => setLineItems([...lineItems, { key: uuid(), productId: "", quantity: 0 }])
    const removeLineItem = (key: string) => lineItems.length > 1 && setLineItems(lineItems.filter((i) => i.key !== key))

    const handleProductSelect = (key: string, productId: string) => {
        setLineItems((prev) =>
            prev.map((i) => i.key === key ? { ...i, productId, quantity: 0 } : i)
        )
    }

    const updateUnitQty = (key: string, newQty: number) => {
        const qty = Math.max(0, newQty)
        if (qty === 0) {
            setLineItems((prev) => prev.filter((i) => i.key !== key))
        } else {
            setLineItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: qty } : i)))
        }
    }

    const handleSubmit = async () => {
        const items = lineItems.filter((i) => i.productId && i.quantity > 0).map((i) => ({ productId: i.productId, quantity: i.quantity }))
        if (!items.length || !user?.id) return
        setSubmitting(true)
        try {
            await createDirectTransfer({ fromLocationId, toLocationId, userId: user.id, notes, items })
            router.push("/stock/transfers")
        } catch (err: any) { alert(err.message) }
        finally { setSubmitting(false) }
    }

    const totalProducts = lineItems.filter((i) => i.productId && i.quantity > 0).length
    const totalUnits = lineItems.reduce((s, i) => s + i.quantity, 0)

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="h-9 w-9">
                    <Link href="/stock/transfers"><ChevronLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Nouveau transfert</h1>
                    <p className="text-muted-foreground text-sm">Déplacer le stock entre les emplacements</p>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-6">
                {/* Route Selection */}
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" /> Itinéraire
                        </CardTitle>
                        <CardDescription>Choisissez la provenance et la destination du stock</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <FromIcon className="h-4 w-4 text-muted-foreground" /> Source
                                </Label>
                                <Select value={fromLocationId} onValueChange={(v) => {
                                    setFromLocationId(v)
                                    setToLocationId("")
                                    setLineItems(lineItems.map((i) => ({ ...i, productId: "" })))
                                }}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Sélectionner..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {activeLocations.map((l: any) => {
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
                            <div className="pb-2">
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <ToIcon className="h-4 w-4 text-muted-foreground" /> Destination
                                </Label>
                                <Select value={toLocationId} onValueChange={setToLocationId} disabled={!fromLocationId}>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Sélectionner..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {destinationLocations.map((l: any) => {
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
                        </div>

                        {/* Route Preview */}
                        {fromLocation && toLocation && (
                            <div className="mt-4 flex items-center justify-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                                <div className="flex items-center gap-1.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                                        <FromIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                    <span className="text-sm font-medium">{fromLocation.name}</span>
                                </div>
                                <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                                <div className="flex items-center gap-1.5">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                                        <ToIcon className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium">{toLocation.name}</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Products */}
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" /> Produits
                                </CardTitle>
                                <CardDescription>Sélectionnez les produits et quantités à transférer</CardDescription>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={addLineItem} disabled={!fromLocationId}>
                                <Plus className="h-4 w-4 mr-1" /> Ajouter
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingStock ? (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-3" /> Chargement du stock disponible...
                            </div>
                        ) : !fromLocationId ? (
                            <div className="border-2 border-dashed rounded-xl py-12 text-center">
                                <Warehouse className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-sm text-muted-foreground">Sélectionnez un emplacement source pour voir les produits disponibles</p>
                            </div>
                        ) : availableProducts.length === 0 ? (
                            <div className="border-2 border-dashed rounded-xl py-12 text-center">
                                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">Aucun stock disponible</p>
                                <p className="text-xs text-muted-foreground/70 mt-1">Cet emplacement n&apos;a pas de produits en stock</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {lineItems.map((item) => {
                                    const error = getItemError(item)
                                    const avail = item.productId ? getProductQty(item.productId) : 0
                                    const pct = item.productId ? Math.min((item.quantity / Math.max(avail, 1)) * 100, 100) : 0

                                    return (
                                        <div key={item.key} className={`p-3 rounded-lg border transition-colors ${error ? "border-destructive/50 bg-destructive/5" : "border-border/50 bg-muted/20 hover:bg-muted/40"}`}>
                                            <div className="flex items-start gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <Select value={item.productId} onValueChange={(v) => handleProductSelect(item.key, v)}>
                                                        <SelectTrigger className={`h-9 ${error ? "border-destructive" : ""}`}>
                                                            <SelectValue placeholder="Choisir un produit..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {getProductsForLine(item.key).map((p: any) => (
                                                                <SelectItem key={p.id} value={p.id}>
                                                                    <div className="flex items-center justify-between w-full gap-4">
                                                                        <span>{p.name}</span>
                                                                        <Badge variant="secondary" className="text-xs shrink-0">{p.availableQty} en stock</Badge>
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    {item.productId && (
                                                        <div className="space-y-1.5">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1">
                                                                    <Input
                                                                        type="number"
                                                                        min={0}
                                                                        max={avail}
                                                                        value={item.quantity || ""}
                                                                        onChange={(e) => updateUnitQty(item.key, Number(e.target.value))}
                                                                        placeholder="Quantité"
                                                                        className={`h-9 text-center ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0">
                                                                    <span className="text-xs text-muted-foreground">dispo :</span>
                                                                    <Badge variant="secondary" className="text-xs font-mono">{avail}</Badge>
                                                                </div>
                                                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={lineItems.length <= 1} onClick={() => removeLineItem(item.key)}>
                                                                    <Trash2 className="h-4 w-4 text-destructive/70" />
                                                                </Button>
                                                            </div>
                                                            {/* Stock level bar */}
                                                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-300 ${error ? "bg-destructive" : pct > 80 ? "bg-amber-500" : "bg-primary"}`}
                                                                    style={{ width: `${pct}%` }}
                                                                />
                                                            </div>
                                                            {error && (
                                                                <p className="text-xs text-destructive flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3" /> {error}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {totalProducts > 0 && (
                            <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-4 py-2.5">
                                <span className="text-muted-foreground">
                                    {totalProducts} produit{totalProducts !== 1 ? "s" : ""}
                                </span>
                                <span className="font-medium">
                                    {totalUnits} unité{totalUnits !== 1 ? "s" : ""}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" /> Notes
                        </CardTitle>
                        <CardDescription>Notes optionnelles pour ce transfert</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                            placeholder="ex: Réapprovisionnement magasin"
                            rows={3} className="resize-none" />
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex items-center justify-between gap-4 pt-2">
                    <Button variant="outline" asChild>
                        <Link href="/stock/transfers">Annuler</Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" onClick={() => {
                            setFromLocationId(""); setToLocationId(""); setNotes("")
                            setLineItems([{ key: uuid(), productId: "", quantity: 0 }])
                        }}>
                            Réinitialiser
                        </Button>
                        <Button type="submit" disabled={submitting || !canSubmit} className="min-w-[180px]">
                            {submitting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Send className="h-4 w-4 mr-2" />
                            )}
                            Transférer maintenant
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    )
}
