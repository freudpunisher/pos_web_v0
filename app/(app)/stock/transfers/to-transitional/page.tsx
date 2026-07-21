"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useLocations } from "@/hooks/use-locations"
import { useUsers } from "@/hooks/use-users"
import { useStockTransfers } from "@/hooks/use-stock-transfers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    ArrowRightLeft, Loader2, Plus, Trash2, Package,
    Warehouse, Store, FileText, Send, AlertCircle, ChevronLeft, ShoppingCart
} from "lucide-react"

interface LineItem {
    key: string
    productId: string
    quantity: string
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

export default function TransferToTransitionalPage() {
    const router = useRouter()
    const { locations } = useLocations()
    const { users } = useUsers()
    const { createTransfer } = useStockTransfers()
    const [submitting, setSubmitting] = useState(false)

    const [fromLocationId, setFromLocationId] = useState("")
    const [toLocationId, setToLocationId] = useState("")
    const [notes, setNotes] = useState("")
    const [lineItems, setLineItems] = useState<LineItem[]>([
        { key: uuid(), productId: "", quantity: "" },
    ])
    const [stockByLocation, setStockByLocation] = useState<any[]>([])
    const [loadingStock, setLoadingStock] = useState(false)

    const currentUserId = users[0]?.id || ""

    const principalLocations = useMemo(() => locations.filter((l: any) => l.type === "principal"), [locations])
    const transitionalLocations = useMemo(() => locations.filter((l: any) => l.type === "transitional"), [locations])

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
                s.product?.productType === "ingredient" ||
                (s.product?.productType === "drink" && s.product?.trackStock)
            )
            .map((s: any) => ({ ...s.product, availableQty: s.quantityOnHand })),
        [stockByLocation]
    )

    const getProductQty = (pid: string) => stockByLocation.find((s: any) => s.productId === pid)?.quantityOnHand ?? 0

    const getItemError = (item: LineItem): string | null => {
        if (!item.productId || !item.quantity) return null
        const qty = parseInt(item.quantity)
        if (isNaN(qty) || qty < 1) return "Invalid quantity"
        const avail = getProductQty(item.productId)
        return qty > avail ? `Only ${avail} available` : null
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
        if (!fromLocationId || !toLocationId) return false
        if (!lineItems.some((i) => i.productId && i.quantity)) return false
        for (const item of lineItems) if (getItemError(item)) return false
        for (const [pid, total] of totalRequestedByProduct) if (total > getProductQty(pid)) return false
        return true
    }, [fromLocationId, toLocationId, lineItems, totalRequestedByProduct])

    const addLineItem = () => setLineItems([...lineItems, { key: uuid(), productId: "", quantity: "" }])
    const removeLineItem = (key: string) => lineItems.length > 1 && setLineItems(lineItems.filter((i) => i.key !== key))
    const updateLineItem = (key: string, field: keyof LineItem, value: string) =>
        setLineItems(lineItems.map((i) => (i.key === key ? { ...i, [field]: value } : i)))

    const handleSubmit = async () => {
        const items = lineItems.filter((i) => i.productId && i.quantity).map((i) => ({ productId: i.productId, quantity: parseInt(i.quantity) }))
        if (!items.length || !currentUserId) return
        setSubmitting(true)
        try {
            await createTransfer({ fromLocationId, toLocationId, userId: currentUserId, notes, items })
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
                    <h1 className="text-2xl font-bold tracking-tight">Restock Transitional Stock</h1>
                    <p className="text-muted-foreground text-sm">Request stock from principal warehouse to transitional</p>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit() }} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <ArrowRightLeft className="h-4 w-4" /> Route
                        </CardTitle>
                        <CardDescription>Principal warehouse &rarr; Transitional stock</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <Warehouse className="h-4 w-4 text-muted-foreground" /> From (Principal)
                                </Label>
                                <Select value={fromLocationId} onValueChange={(v) => {
                                    setFromLocationId(v)
                                    setLineItems(lineItems.map((i) => ({ ...i, productId: "" })))
                                }}>
                                    <SelectTrigger className="h-10"><SelectValue placeholder="Select warehouse..." /></SelectTrigger>
                                    <SelectContent>
                                        {principalLocations.map((l: any) => (
                                            <SelectItem key={l.id} value={l.id}>
                                                <div className="flex items-center gap-2"><Warehouse className="h-4 w-4" /> {l.name}</div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pb-2"><ArrowRightLeft className="h-6 w-6 text-muted-foreground" /></div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium flex items-center gap-1.5">
                                    <Store className="h-4 w-4 text-muted-foreground" /> To (Transitional)
                                </Label>
                                <Select value={toLocationId} onValueChange={setToLocationId}>
                                    <SelectTrigger className="h-10"><SelectValue placeholder="Select transitional..." /></SelectTrigger>
                                    <SelectContent>
                                        {transitionalLocations.map((l: any) => (
                                            <SelectItem key={l.id} value={l.id}>
                                                <div className="flex items-center gap-2"><Store className="h-4 w-4" /> {l.name}</div>
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
                            <CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Products</CardTitle>
                            <CardDescription>Select products to restock the transitional location</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={addLineItem} disabled={!fromLocationId}>
                            <Plus className="h-4 w-4 mr-1" /> Add Item
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingStock ? (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="h-6 w-6 animate-spin mr-3" /> Loading available stock...
                            </div>
                        ) : !fromLocationId ? (
                            <div className="border-2 border-dashed rounded-lg py-12 text-center">
                                <Warehouse className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                                <p className="text-sm text-muted-foreground">Select a principal warehouse to see available products</p>
                            </div>
                        ) : availableProducts.length === 0 ? (
                            <div className="border-2 border-dashed rounded-lg py-12 text-center">
                                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                                <p className="text-sm font-medium text-muted-foreground">No stock available</p>
                                <p className="text-xs text-muted-foreground mt-1">This warehouse has no trackable products in stock</p>
                            </div>
                        ) : (
                            <div className="border rounded-lg overflow-hidden">
                                <div className="grid grid-cols-[1fr,8rem,5rem,auto] gap-3 px-4 py-2.5 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <span>Product</span>
                                    <span className="text-center">Quantity</span>
                                    <span className="text-right">Stock</span>
                                    <span className="w-9" />
                                </div>
                                <div className="divide-y">
                                    {lineItems.map((item) => {
                                        const error = getItemError(item)
                                        return (
                                            <div key={item.key} className="grid grid-cols-[1fr,8rem,5rem,auto] gap-3 px-4 py-3 items-start">
                                                <Select value={item.productId} onValueChange={(v) => updateLineItem(item.key, "productId", v)}>
                                                    <SelectTrigger className={`h-9 ${error ? "border-destructive" : ""}`}>
                                                        <SelectValue placeholder="Choose product..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableProducts.map((p: any) => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                <div className="flex items-center justify-between w-full gap-4">
                                                                    <span>{p.name}</span>
                                                                    <Badge variant="secondary" className="text-xs shrink-0">{p.availableQty} in stock</Badge>
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
                                <span className="text-muted-foreground">{lineItems.filter((i) => i.productId && i.quantity).length} product(s)</span>
                                <span className="font-medium">Total: {lineItems.reduce((sum, i) => sum + (parseInt(i.quantity) || 0), 0)} units</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Notes</CardTitle>
                        <CardDescription>Optional notes for this request</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                            placeholder="e.g. Restock transitional for upcoming week" rows={3} className="resize-none" />
                    </CardContent>
                </Card>

                <div className="flex items-center justify-between gap-4">
                    <Button variant="outline" asChild><Link href="/stock/transfers">Cancel</Link></Button>
                    <Button type="submit" disabled={submitting || !canSubmit} size="lg" className="min-w-[160px]">
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Submit Request
                    </Button>
                </div>
            </form>
        </div>
    )
}
