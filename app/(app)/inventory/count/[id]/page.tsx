"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    ClipboardList,
    Save,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    ArrowLeft,
    User,
    Package,
    Search,
    Plus,
    PlusCircle
} from "lucide-react"
import { useInventorySessions } from "@/hooks/use-inventory-sessions"
import { useProducts } from "@/hooks/use-products"
import { formatCurrency } from "@/lib/mock-data"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function CountSessionPage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [session, setSession] = useState<any>(null)
    const [localCounts, setLocalCounts] = useState<Record<string, number>>({})
    const [isSaving, setIsSaving] = useState(false)
    const [isReconciling, setIsReconciling] = useState(false)
    const [isAddingItem, setIsAddingItem] = useState(false)
    const [search, setSearch] = useState("")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState("")
    const [quickProductId, setQuickProductId] = useState("")
    const [quickPhysicalQty, setQuickPhysicalQty] = useState("")
    const [isQuickSaving, setIsQuickSaving] = useState(false)

    const { getSession, updateSessionItems, reconcileSession, addItemToSession } = useInventorySessions()
    const { products } = useProducts()

    useEffect(() => {
        const load = async () => {
            const data = await getSession(id)
            setSession(data)

            // Initialize local counts from session items
            const counts: Record<string, number> = {}
            data.items.forEach((item: any) => {
                counts[item.productId] = Number(item.physicalQuantity ?? 0)
            })
            setLocalCounts(counts)
        }
        load()
    }, [id])

    const filteredItems = useMemo(() => {
        if (!session) return []
        return session.items.filter((item: any) =>
            item.product.name.toLowerCase().includes(search.toLowerCase()) ||
            item.product.sku.toLowerCase().includes(search.toLowerCase())
        )
    }, [session, search])

    const handleCountChange = (productId: string, value: string) => {
        const parsed = value === "" ? 0 : Number.parseFloat(value)
        const num = Number.isFinite(parsed) ? parsed : 0
        setLocalCounts(prev => ({ ...prev, [productId]: num }))
    }

    const totals = useMemo(() => {
        if (!session) return { loss: 0, surplus: 0, variance: 0 }
        return session.items.reduce((acc: any, item: any) => {
            const localValue = localCounts[item.productId]
            const phyCount = Number.isFinite(localValue) ? localValue : Number(item.physicalQuantity ?? 0)
            const systemQty = Number(item.quantityInStock ?? 0)
            const variance = phyCount - systemQty
            if (variance < 0) acc.loss += Math.abs(variance)
            if (variance > 0) acc.surplus += variance
            acc.variance += variance
            return acc
        }, { loss: 0, surplus: 0, variance: 0 })
    }, [session, localCounts])

    const handleSaveProgress = async () => {
        setIsSaving(true)
        try {
            const itemsToUpdate = Object.entries(localCounts).map(([productId, physicalQuantity]) => ({
                productId,
                physicalQuantity: Number.isFinite(physicalQuantity) ? physicalQuantity : 0
            }))
            await updateSessionItems(id, itemsToUpdate)
            // Refresh session data
            const data = await getSession(id)
            setSession(data)
        } catch (error) {
            console.error("Failed to save progress:", error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleReconcile = async () => {
        if (!confirm("This will permanently adjust your stock levels based on the physical count. Proceed?")) return

        setIsReconciling(true)
        try {
            // First save progress to ensure items are up to date in DB
            const itemsToUpdate = Object.entries(localCounts).map(([productId, physicalQuantity]) => ({
                productId,
                physicalQuantity: Number.isFinite(physicalQuantity) ? physicalQuantity : 0
            }))
            await updateSessionItems(id, itemsToUpdate)

            // Then reconcile
            await reconcileSession(id)
            router.push("/inventory/count")
        } catch (error) {
            console.error("Failed to reconcile:", error)
        } finally {
            setIsReconciling(false)
        }
    }

    const handleAddItem = async () => {
        if (!selectedProductId) return
        setIsAddingItem(true)
        try {
            await addItemToSession(id, selectedProductId)
            // Refresh data
            const data = await getSession(id)
            setSession(data)
            // Update local counts
            setLocalCounts(prev => {
                const next = { ...prev }
                delete next[selectedProductId]
                return next
            })
            setIsAddDialogOpen(false)
            setSelectedProductId("")
        } catch (error: any) {
            alert(error.message)
        } finally {
            setIsAddingItem(false)
        }
    }

    const quickSelectedItem = useMemo(() => {
        if (!session || !quickProductId) return null
        return session.items.find((item: any) => item.productId === quickProductId) || null
    }, [session, quickProductId])

    useEffect(() => {
        if (!quickSelectedItem) return
        const localValue = localCounts[quickSelectedItem.productId]
        const initialQty = Number.isFinite(localValue) ? localValue : Number(quickSelectedItem.physicalQuantity ?? 0)
        setQuickPhysicalQty(initialQty.toString())
    }, [quickSelectedItem, localCounts])

    const quickLogicalQty = Number(quickSelectedItem?.quantityInStock ?? 0)
    const quickPhysicalQtyNum = Number.parseFloat(quickPhysicalQty || "0") || 0
    const quickVariance = quickPhysicalQtyNum - quickLogicalQty
    const quickLoss = quickVariance < 0 ? Math.abs(quickVariance) : 0

    const handleQuickSave = async () => {
        if (!quickSelectedItem) return
        if (!Number.isFinite(quickPhysicalQtyNum) || quickPhysicalQtyNum < 0) {
            alert("Quantite physique invalide")
            return
        }

        setIsQuickSaving(true)
        try {
            const response = await fetch(`/api/inventory-sessions/${id}/adjust-item`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    productId: quickSelectedItem.productId,
                    physicalQuantity: quickPhysicalQtyNum,
                }),
            })
            const result = await response.json()
            if (!response.ok) {
                throw new Error(result?.error || "Echec de l'ajustement")
            }
            const refreshedSession = await getSession(id)
            setSession(refreshedSession)
            setQuickPhysicalQty("")
        } catch (error: any) {
            alert(error.message || "Echec de l'enregistrement")
        } finally {
            setIsQuickSaving(false)
        }
    }

    if (!session) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    const isReconciled = session.status === "reconciled"

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-3xl font-bold tracking-tight text-foreground">Count Session</h2>
                            {isReconciled ? (
                                <Badge className="bg-accent/20 text-accent font-bold ring-1 ring-accent/30 lowercase h-6">
                                    <CheckCircle2 className="mr-1 h-3 w-3" /> Reconciled
                                </Badge>
                            ) : (
                                <Badge className="bg-warning/20 text-warning font-bold ring-1 ring-warning/30 lowercase h-6">
                                    In Progress
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground flex items-center gap-4 mt-1">
                            <span className="flex items-center gap-1 font-medium"><User className="h-3 w-3 text-primary" /> {session.user?.name}</span>
                            <span className="font-mono text-xs opacity-50">ID: {session.id}</span>
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4 rounded-lg border border-border/50 bg-secondary/10 px-4 py-2">
                    <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Perte Totale</p>
                        <p className="font-black text-destructive">{totals.loss.toFixed(3)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Surplus Total</p>
                        <p className="font-black text-accent">{totals.surplus.toFixed(3)}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {!isReconciled && (
                        <>
                            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/5">
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Add Item to List
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[425px]">
                                    <DialogHeader>
                                        <DialogTitle>Add Product to Count</DialogTitle>
                                        <DialogDescription>
                                            Select a product to add to this session for verification.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Select Product</Label>
                                            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Which product are you adding?" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {products
                                                        .filter(p => !session.items.some((item: any) => item.productId === p.id))
                                                        .map(p => (
                                                            <SelectItem key={p.id} value={p.id}>{p.name} — <span className="opacity-50 text-xs">{p.sku}</span></SelectItem>
                                                        ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                        <Button onClick={handleAddItem} disabled={!selectedProductId || isAddingItem}>
                                            {isAddingItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Add to Count
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                            <Button variant="outline" onClick={handleSaveProgress} disabled={isSaving || isReconciling}>
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Progress
                            </Button>
                            <Button className="bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20" onClick={handleReconcile} disabled={isSaving || isReconciling}>
                                {isReconciling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                Finalize & Reconcile
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {!isReconciled && (
                <Card className="border-border/50 shadow-xl">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base font-bold">Formulaire inventaire (produit + stock physique)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2 space-y-2">
                                <Label>Produit</Label>
                                <Select value={quickProductId} onValueChange={setQuickProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selectionner un produit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {session.items.map((item: any) => (
                                            <SelectItem key={item.productId} value={item.productId}>
                                                {item.product.name} - {item.product.sku}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Quantite physique</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    value={quickPhysicalQty}
                                    onChange={(e) => setQuickPhysicalQty(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button className="w-full" onClick={handleQuickSave} disabled={!quickProductId || isQuickSaving}>
                                    {isQuickSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Ajuster stock
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="rounded-md border border-border/50 px-3 py-2">
                                <p className="text-muted-foreground">Stock logique</p>
                                <p className="font-bold">{quickLogicalQty.toFixed(3)}</p>
                            </div>
                            <div className="rounded-md border border-border/50 px-3 py-2">
                                <p className="text-muted-foreground">Difference</p>
                                <p className={`font-bold ${quickVariance < 0 ? "text-destructive" : quickVariance > 0 ? "text-accent" : ""}`}>
                                    {quickVariance > 0 ? "+" : ""}
                                    {quickVariance.toFixed(3)}
                                </p>
                            </div>
                            <div className="rounded-md border border-border/50 px-3 py-2">
                                <p className="text-muted-foreground">Perte</p>
                                <p className="font-bold text-destructive">{quickLoss.toFixed(3)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card className="border-border/50 shadow-xl overflow-hidden">
                <CardHeader className="bg-secondary/10 border-b border-border/50 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            Inventory Verification Sheet
                        </CardTitle>
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search products..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 h-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary/5 border-border/50">
                                <TableHead className="py-4 px-6 font-bold">Product</TableHead>
                                <TableHead className="py-4 px-6 font-bold text-right">Stock ancien</TableHead>
                                <TableHead className="py-4 px-6 font-bold text-center w-40">Stock physique</TableHead>
                                <TableHead className="py-4 px-6 font-bold text-right">Perte</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.map((item: any) => {
                                const localValue = localCounts[item.productId]
                                const phyCount = Number.isFinite(localValue) ? localValue : Number(item.physicalQuantity ?? 0)
                                const oldStock = Number(item.quantityInStock ?? 0)
                                const loss = oldStock - phyCount

                                return (
                                    <TableRow key={item.id} className="border-border/50 hover:bg-secondary/5 group transition-colors">
                                        <TableCell className="py-4 px-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground">{item.product.name}</span>
                                                <span className="text-[10px] font-mono text-muted-foreground">{item.product.sku}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right py-4 px-6 font-black opacity-60">
                                            {oldStock}
                                        </TableCell>
                                        <TableCell className="py-2 px-6">
                                            <Input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                className="text-center font-bold text-lg h-10 border-border/50 focus:border-primary focus:ring-1 focus:ring-primary/20"
                                                value={phyCount}
                                                onChange={(e) => handleCountChange(item.productId, e.target.value)}
                                                disabled={isReconciled}
                                            />
                                        </TableCell>
                                        <TableCell className={`text-right py-4 px-6 font-black text-lg ${loss <= 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                                            {loss > 0 ? loss.toFixed(3) : "-"}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {!isReconciled && (
                <div className="flex items-center gap-2 p-4 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm font-medium">
                    <AlertTriangle className="h-5 w-5" />
                    Finalizing will align logical stock with physical stock and record losses/surpluses permanently.
                </div>
            )}
        </div>
    )
}
