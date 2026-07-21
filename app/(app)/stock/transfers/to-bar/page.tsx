"use client"

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
    Store, FileText, Send, AlertCircle, ChevronLeft, ShoppingCart, Beer
} from "lucide-react"

interface LineItem {
    key: string
    productId: string
    productType: string
    quantity: number
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

export default function TransferToBarPage() {
    const router = useRouter()
    const { user } = useAuth()
    const { locations } = useLocations()
    const { createTransfer } = useStockTransfers()
    const [submitting, setSubmitting] = useState(false)

    const [fromLocationId, setFromLocationId] = useState("")
    const [toLocationId, setToLocationId] = useState("")
    const [notes, setNotes] = useState("")
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { key: uuid(), productId: "", productType: "", quantity: 0 },
    ])
    const [stockByLocation, setStockByLocation] = useState<any[]>([])
    const [loadingStock, setLoadingStock] = useState(false)

    const transitionalLocations = useMemo(() => locations.filter((l: any) => l.type === "transitional"), [locations])
    const barLocations = useMemo(() => locations.filter((l: any) => l.type === "bar"), [locations])

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
                (s.product?.productType === "drink" || s.product?.productType === "ingredient") && 
                s.product?.trackStock &&
                s.product?.sector === "Bar"
            )
            .map((s: any) => ({ ...s.product, availableQty: s.quantityOnHand })),
        [stockByLocation]
    )

    const getProductQty = (pid: string) => stockByLocation.find((s: any) => s.productId === pid)?.quantityOnHand ?? 0

    const getItemError = (item: LineItem): string | null => {
        if (!item.productId || item.quantity < 1) return null
        const avail = getProductQty(item.productId)
        return item.quantity > avail ? `Seulement ${avail} disponible(s)` : null
    }

    const canSubmit = useMemo(() => {
        if (!fromLocationId || !toLocationId) return false
        if (!lineItems.some((i) => i.productId && i.quantity > 0)) return false
        for (const item of lineItems) {
            if (getItemError(item)) return false
            if (item.quantity > getProductQty(item.productId)) return false
        }
        return true
    }, [fromLocationId, toLocationId, lineItems])

    const addLineItem = () => setLineItems([...lineItems, { key: uuid(), productId: "", productType: "", quantity: 0 }])
    const removeLineItem = (key: string) => lineItems.length > 1 && setLineItems(lineItems.filter((i) => i.key !== key))

    const handleProductSelect = (key: string, productId: string) => {
        const product = availableProducts.find((p: any) => p.id === productId)
        if (!product) return
        setLineItems((prev) =>
            prev.map((i) =>
                i.key === key
                    ? { ...i, productId, productType: product.productType, quantity: 0 }
                    : i
            )
        )
    }

    const updateQuantity = (key: string, newQty: number) => {
        const qty = Math.max(0, newQty)
        setLineItems((prev) =>
            prev.map((i) =>
                i.key === key ? { ...i, quantity: qty } : i
            )
        )
    }

    const handleSubmit = async () => {
        const items = lineItems.filter((i) => i.productId && i.quantity > 0).map((i) => ({ productId: i.productId, quantity: i.quantity }))
        if (!items.length || !user?.id) return
        setSubmitting(true)
        try {
            await createTransfer({ fromLocationId, toLocationId, userId: user.id, notes, items })
            router.push("/stock/transfers")
        } catch (err: any) { alert(err.message) }
        finally { setSubmitting(false) }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/stock/transfers"><ChevronLeft className="h-5 w-5" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Demande de stock — Bar</h1>
                    <p className="text-muted-foreground text-sm">Demander des boissons du stock de transition vers le bar</p>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4" /> Itinéraire
                        </CardTitle>
                        <CardDescription>Stock de transition &rarr; Bar</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <Store className="h-4 w-4 text-muted-foreground" /> De (Transition)
                                </Label>
                                <Select value={fromLocationId} onValueChange={(v) => {
                                    setFromLocationId(v)
                                    setLineItems(lineItems.map((i) => ({ ...i, productId: "" })))
                                }}>
                                    <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner un transit..." /></SelectTrigger>
                                    <SelectContent>
                                        {transitionalLocations.map((l: any) => (
                                            <SelectItem key={l.id} value={l.id}>
                                                <div className="flex items-center gap-2"><Store className="h-4 w-4" /> {l.name}</div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pb-2"><ArrowRightLeft className="h-6 w-6 text-muted-foreground" /></div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <Beer className="h-4 w-4 text-muted-foreground" /> Vers (Bar)
                                </Label>
                                <Select value={toLocationId} onValueChange={setToLocationId}>
                                    <SelectTrigger className="h-10"><SelectValue placeholder="Sélectionner un bar..." /></SelectTrigger>
                                    <SelectContent>
                                        {barLocations.map((l: any) => (
                                            <SelectItem key={l.id} value={l.id}>
                                                <div className="flex items-center gap-2"><Beer className="h-4 w-4" /> {l.name}</div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Boissons</CardTitle>
                            <CardDescription>Sélectionnez les boissons à demander pour le bar</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addLineItem} disabled={!fromLocationId}>
                            <Plus className="h-4 w-4 mr-1" /> Ajouter un article
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingStock ? (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-3" /> Chargement du stock disponible...
                            </div>
                        ) : !fromLocationId ? (
                            <div className="border-2 border-dashed rounded-lg py-12 text-center">
                                <Store className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                                <p className="text-sm text-muted-foreground">Sélectionnez un emplacement de transition pour voir les produits disponibles</p>
                            </div>
                        ) : availableProducts.length === 0 ? (
                            <div className="border-2 border-dashed rounded-lg py-12 text-center">
                                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">Aucune boisson disponible</p>
                                <p className="text-xs text-muted-foreground mt-1">Cet emplacement de transition n'a pas de stock de boissons</p>
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
                                                <Select value={item.productId} onValueChange={(v) => handleProductSelect(item.key, v)}>
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
                                                <div className="flex items-center justify-center pt-0.5">
                                                    {item.productId ? (
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                value={item.quantity || ""}
                                                                onChange={(e) => updateQuantity(item.key, Number(e.target.value))}
                                                                className={`w-24 text-center h-8 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                                            />
                                                            {error && <p className="text-[10px] text-destructive text-center">{error}</p>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
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

                        {lineItems.some((i) => i.productId && i.quantity > 0) && (
                            <div className="flex items-center justify-between text-sm bg-muted/30 rounded-lg px-4 py-2.5">
                                <span className="text-muted-foreground">{lineItems.filter((i) => i.productId && i.quantity > 0).length} produit(s)</span>
                                <span className="font-medium">{lineItems.reduce((s, i) => s + i.quantity, 0)} unités</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Notes</CardTitle>
                        <CardDescription>Notes optionnelles pour cette demande</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                            placeholder="ex: Besoin de plus de stock pour le week-end" rows={3} className="resize-none" />
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" asChild><Link href="/stock/transfers">Annuler</Link></Button>
                    <Button type="submit" disabled={submitting || !canSubmit} size="lg" className="min-w-[160px]">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Soumettre la demande
                    </Button>
                </div>
            </form>
        </div>
    )
}
