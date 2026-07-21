"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLocations } from "@/hooks/use-locations"
import { useUsers } from "@/hooks/use-users"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import {
    ArrowRightLeft, Loader2, Plus, Trash2, Package,
    Store, FileText, Send, AlertCircle, ChevronLeft, Beer, Layers
} from "lucide-react"

interface LineItem {
    key: string
    productId: string
    productName: string
    quantity: string
    availableQty: number
}

function uuid(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
    })
}

export default function SortieBarPage() {
    const router = useRouter()
    const { locations } = useLocations()
    const { users } = useUsers()
    const { user } = useAuth()
    const [submitting, setSubmitting] = useState(false)

    const [fromLocationId, setFromLocationId] = useState("")
    const [notes, setNotes] = useState("")
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { key: uuid(), productId: "", productName: "", quantity: "", availableQty: 0 },
    ])
    const [stockByLocation, setStockByLocation] = useState<any[]>([])
    const [loadingStock, setLoadingStock] = useState(false)

    const currentUserId = user?.id || users[0]?.id || ""

    const barLocations = useMemo(() => locations.filter((l: any) => l.type === "bar" || l.type === "transitional"), [locations])

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
            .filter((s: any) =>
                s.quantityOnHand > 0 &&
                (s.product?.productType !== "food") &&
                s.product?.trackStock !== false
            )
            .map((s: any) => ({ ...s.product, availableQty: s.quantityOnHand })),
        [stockByLocation]
    )

    const getProductQty = (pid: string) => stockByLocation.find((s: any) => s.productId === pid)?.quantityOnHand ?? 0

    const getItemError = (item: LineItem): string | null => {
        if (!item.productId || !item.quantity) return null
        const qty = parseInt(item.quantity)
        if (isNaN(qty) || qty < 1) return "Quantité invalide"
        const avail = getProductQty(item.productId)
        return qty > avail ? `Seulement ${avail} disponible(s)` : null
    }

    const totalRequestedByProduct = useMemo(() => {
        const map = new Map<string, number>()
        for (const item of lineItems) {
            if (item.productId && item.quantity) {
                const qty = parseInt(item.quantity)
                if (!isNaN(qty)) map.set(item.productId, (map.get(item.productId) || 0) + qty)
            }
        }
        return map
    }, [lineItems])

    const canSubmit = useMemo(() => {
        if (!fromLocationId) return false
        if (!lineItems.some((i) => i.productId && i.quantity)) return false
        for (const item of lineItems) if (getItemError(item)) return false
        for (const [pid, total] of totalRequestedByProduct) if (total > getProductQty(pid)) return false
        return true
    }, [fromLocationId, lineItems, totalRequestedByProduct])

    const addLineItem = () => setLineItems([...lineItems, { key: uuid(), productId: "", productName: "", quantity: "", availableQty: 0 }])
    const removeLineItem = (key: string) => lineItems.length > 1 && setLineItems(lineItems.filter((i) => i.key !== key))
    const updateLineItem = (key: string, field: keyof LineItem, value: any) =>
        setLineItems(lineItems.map((i) => (i.key === key ? { ...i, [field]: value } : i)))

    const handleSubmit = async () => {
        const items = lineItems.filter((i) => i.productId && i.quantity)
        if (!items.length || !currentUserId) return
        setSubmitting(true)
        try {
            for (const item of items) {
                const product = availableProducts.find((p: any) => p.id === item.productId)
                const res = await fetch("/api/stock/adjustments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        productId: item.productId,
                        productName: product?.name || "Unknown",
                        quantityChange: -parseInt(item.quantity),
                        adjustmentType: "subtraction",
                        reason: "Consommation bar / cocktail",
                        notes: notes || "Sortie de stock bar",
                        userId: currentUserId,
                        locationId: fromLocationId,
                    }),
                })
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error || `Erreur pour ${product?.name}`)
                }
            }
            toast({ title: "Sortie enregistrée", description: `${items.length} produit(s) retiré(s) du stock bar.` })
            router.push("/stock/transfers")
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erreur", description: err.message || "Impossible d'enregistrer la sortie" })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/stock/transfers"><ChevronLeft className="h-5 w-5" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Sortie Bar</h1>
                    <p className="text-muted-foreground text-sm">Retirer des produits du stock pour consommation cocktail</p>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Layers className="h-4 w-4" /> Source
                        </CardTitle>
                        <CardDescription>Retirer du stock bar pour consommation cocktail</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <Store className="h-4 w-4 text-muted-foreground" /> Depuis (Stock)
                            </Label>
                            <Select value={fromLocationId} onValueChange={(v) => {
                                setFromLocationId(v)
                                setLineItems(lineItems.map((i) => ({ ...i, productId: "", quantity: "" })))
                            }}>
                                <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner un stock..." /></SelectTrigger>
                                <SelectContent>
                                    {barLocations.map((l: any) => (
                                        <SelectItem key={l.id} value={l.id}>
                                            <div className="flex items-center gap-2"><Store className="h-4 w-4" /> {l.name}</div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Produits</CardTitle>
                            <CardDescription>Sélectionnez les produits consommés pour les cocktails</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addLineItem} disabled={!fromLocationId}>
                            <Plus className="h-4 w-4 mr-1" /> Ajouter
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingStock ? (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-3" /> Chargement du stock...
                            </div>
                        ) : !fromLocationId ? (
                            <div className="border-2 border-dashed rounded-lg py-12 text-center">
                                <Store className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                                <p className="text-sm text-muted-foreground">Sélectionnez un stock pour voir les produits disponibles</p>
                            </div>
                        ) : availableProducts.length === 0 ? (
                            <div className="border-2 border-dashed rounded-lg py-12 text-center">
                                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">Aucun produit disponible</p>
                                <p className="text-xs text-muted-foreground mt-1">Ce stock n&apos;a pas de produits à retirer</p>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="grid grid-cols-[1fr,8rem,5rem,auto] gap-3 px-4 py-2.5 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <span>Produit</span>
                                    <span className="text-center">Quantité</span>
                                    <span className="text-right">Stock</span>
                                    <span className="w-9" />
                                </div>
                                <div className="divide-y">
                                    {lineItems.map((item) => {
                                        const error = getItemError(item)
                                        return (
                                            <div key={item.key} className="grid grid-cols-[1fr,8rem,5rem,auto] gap-3 px-4 py-3 items-start">
                                                <Select value={item.productId} onValueChange={(v) => {
                                                    const prod = availableProducts.find((p: any) => p.id === v)
                                                    setLineItems((prev) =>
                                                        prev.map((i) =>
                                                            i.key === item.key
                                                                ? { ...i, productId: v, productName: prod?.name || "" }
                                                                : i
                                                        )
                                                    )
                                                }}>
                                                    <SelectTrigger className={`h-9 ${error ? "border-destructive" : ""}`}>
                                                        <SelectValue placeholder="Choisir un produit..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableProducts.map((p: any) => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                <div className="flex items-center justify-between w-full gap-4">
                                                                    <span>{p.name}</span>
                                                                    <Badge variant="secondary" className="text-xs shrink-0">{p.availableQty} en stock</Badge>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <div className="space-y-0.5">
                                                    <Input type="number" min={1} max={item.productId ? getProductQty(item.productId) : undefined}
                                                        value={item.quantity} onChange={(e) => updateLineItem(item.key, "quantity", e.target.value)}
                                                        placeholder="0" className={`h-9 text-center ${error ? "border-destructive" : ""}`} />
                                                    {error && <p className="text-xs text-destructive text-center">{error}</p>}
                                                </div>
                                                <div className="text-sm text-muted-foreground text-right pt-2">
                                                    {item.productId ? <Badge variant="secondary" className="text-xs font-mono">{getProductQty(item.productId)}</Badge> : "—"}
                                                </div>
                                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={lineItems.length <= 1} onClick={() => removeLineItem(item.key)}>
                                                    <Trash2 className="h-4 w-4 text-destructive/70" />
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {lineItems.some((i) => i.productId && i.quantity) && (
                            <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-4 py-2.5">
                                <span className="text-muted-foreground">{lineItems.filter((i) => i.productId && i.quantity).length} produit(s)</span>
                                <span className="font-medium">Total: {lineItems.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0)} unités</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Notes</CardTitle>
                        <CardDescription>Notes optionnelles pour cette sortie</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Ingrédients pour cocktails du soir" rows={3} className="resize-none" />
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" asChild><Link href="/stock/transfers">Annuler</Link></Button>
                    <Button type="submit" disabled={submitting || !canSubmit} size="lg" className="min-w-[160px]">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Enregistrer la sortie
                    </Button>
                </div>
            </form>
        </div>
    )
}
