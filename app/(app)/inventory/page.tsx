"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import {
    Search, Package, AlertTriangle, Loader2, Clock, ArrowDownCircle,
    Warehouse, Store, Save, Printer, TrendingDown, TrendingUp, BarChart3,
    MapPin, Building2, Hash, Calendar, Minus, AlertCircle, CheckCircle2, XCircle
} from "lucide-react"
import { useStock } from "@/hooks/use-stock"
import { useLocations } from "@/hooks/use-locations"
import { useAuth } from "@/lib/auth-context"
import { useSettings } from "@/hooks/use-settings"
import { useProductTypes } from "@/hooks/use-product-types"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { formatStockFromSellingUnits } from "@/lib/stock-utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function InventoryStatusPage() {
    const { user } = useAuth()
    const { settings } = useSettings()
    const [search, setSearch] = useState("")
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
    const [productType, setProductType] = useState<string>("all")
    const { stockItems, adjustments, loading, createAdjustment } = useStock()
    const { locations } = useLocations()
    const { activeTypes } = useProductTypes()
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [inventoryForm, setInventoryForm] = useState({ productId: "", physicalQuantity: "" })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const isBakeryUser = (user?.role as string) === "cashier_bakery" || (user?.role as string) === "supervisor_bakery" || user?.role === "admin"

    const filteredByLocation = useMemo(() => {
        let items = stockItems
        if (productType !== "all") {
            items = items.filter(item => item.product.productTypeId === productType)
        }
        if (selectedLocationId) {
            items = items.filter(item => item.locationId === selectedLocationId)
        }
        return items
    }, [stockItems, selectedLocationId, productType])

    const filteredInventory = useMemo(() => {
        return filteredByLocation.filter(item =>
            item.product.name.toLowerCase().includes(search.toLowerCase()) ||
            item.product.sku.toLowerCase().includes(search.toLowerCase())
        )
    }, [filteredByLocation, search])

    const selectedLocation = locations.find(l => l.id === selectedLocationId)

    const bakeryProducts = useMemo(() => {
        const seen = new Set<string>()
        return stockItems.filter(item => {
            if (seen.has(item.productId)) return false
            seen.add(item.productId)
            return true
        })
    }, [stockItems])

    const selectedStockItem = useMemo(() => {
        return stockItems.find(item => item.productId === inventoryForm.productId)
    }, [stockItems, inventoryForm.productId])

    const physicalQtyNum = parseFloat(inventoryForm.physicalQuantity) || 0
    const logicalQty = selectedStockItem ? parseFloat(selectedStockItem.quantityOnHand) : 0
    const variance = physicalQtyNum - logicalQty
    const loss = variance < 0 ? Math.abs(variance) : 0

    const totalPages = Math.max(1, Math.ceil(filteredInventory.length / pageSize))
    const currentPage = Math.min(page, totalPages)
    const paginatedInventory = filteredInventory.slice((currentPage - 1) * pageSize, currentPage * pageSize)

    const stats = useMemo(() => ({
        totalUnits: filteredByLocation.reduce((acc, item) => acc + Number(item.quantityOnHand), 0),
        reserved: filteredByLocation.reduce((acc, item) => acc + item.quantityReserved, 0),
        alerts: filteredByLocation.filter(item => Number(item.quantityOnHand) <= item.reorderLevel).length,
        products: new Set(filteredByLocation.map(i => i.product.id)).size,
        outOfStock: filteredByLocation.filter(item => Number(item.quantityOnHand) <= 0).length,
        lowStock: filteredByLocation.filter(item => Number(item.quantityOnHand) > 0 && Number(item.quantityOnHand) <= item.reorderLevel).length,
    }), [filteredByLocation])

    const handleSearchChange = (value: string) => {
        setSearch(value)
        setPage(1)
    }

    const handlePageSizeChange = (value: string) => {
        setPageSize(Number(value))
        setPage(1)
    }

    const handleInventorySubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!inventoryForm.productId || inventoryForm.physicalQuantity === "") {
            toast.error("Veuillez sélectionner un produit et saisir une quantité physique")
            return
        }
        setIsSubmitting(true)
        try {
            await createAdjustment({
                productId: inventoryForm.productId,
                productName: selectedStockItem?.product.name,
                quantityChange: variance,
                adjustmentType: "stock_count",
                reason: "Inventaire physique",
                notes: `Ajustement d'inventaire - Stock avant: ${logicalQty}, Stock après: ${physicalQtyNum}`,
                userId: user?.id
            })
            toast.success("Inventaire enregistré et stock mis à jour")
            setInventoryForm({ productId: "", physicalQuantity: "" })
        } catch (error: any) {
            toast.error(error.message || "Erreur lors de l'enregistrement de l'inventaire")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handlePrintStock = () => {
        const printWindow = window.open("", "_blank")
        if (!printWindow) return
        const locLabel = selectedLocationId
            ? `${locations.find(l => l.id === selectedLocationId)?.name}`
            : "Tous les emplacements"
        const rows = filteredByLocation.map((item) => `
      <tr>
        <td style="padding:6px 10px;border:1px solid #d1d5db;font-weight:600;color:#111827">${item.product.name}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;color:#374151;font-family:monospace;font-size:12px">${item.product.sku}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;color:#374151;font-size:12px">${item.location?.name || "—"}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;text-align:right;font-weight:700">${Number(item.quantityOnHand).toFixed(3)}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;text-align:right;color:#d97706">${item.quantityReserved}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;text-align:right;color:#6b7280;font-size:12px">${item.reorderLevel}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;text-align:right;color:#6b7280;font-size:12px">${item.reorderQuantity || "—"}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;text-align:center">${
            Number(item.quantityOnHand) <= item.reorderLevel
                ? '<span style="color:#ef4444;font-weight:600">⚠ Alerte</span>'
                : '<span style="color:#10b981;font-weight:600">✓ OK</span>'
        }</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;font-size:12px;color:#6b7280">${item.lastCountDate ? new Date(item.lastCountDate).toLocaleDateString("fr-FR") : "—"}</td>
      </tr>
    `).join("")
        printWindow.document.write(`
      <html>
      <head>
        <title>État des stocks</title>
        <style>
          @page { size: landscape; margin: 15mm; }
          body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 20px; color: #1f2937; }
          .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1f2937; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }
          .header p { margin: 4px 0; font-size: 13px; color: #4b5563; }
          .meta { display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; margin-bottom: 16px; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #1f2937; color: #fff; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
          th.right { text-align: right; }
          th.center { text-align: center; }
          tr:nth-child(even) { background: #f9fafb; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
          .summary { display: flex; gap: 24px; margin-bottom: 16px; font-size: 13px; }
          .summary-item { background: #f3f4f6; padding: 8px 16px; border-radius: 6px; }
          .summary-item strong { display: block; font-size: 18px; color: #111827; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${settings?.name || "SmartPOS"}</h1>
          ${settings?.address ? `<p>${settings.address}</p>` : ""}
          ${settings?.phone ? `<p>Tel: ${settings.phone}</p>` : ""}
          <p style="margin-top:8px;font-size:14px;font-weight:600;color:#374151">État des stocks — ${locLabel}</p>
        </div>
        <div class="meta">
          <span>Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
          <span>${filteredByLocation.length} produit(s)</span>
        </div>
        <div class="summary">
          <div class="summary-item">Total unités <strong>${filteredByLocation.reduce((a, i) => a + Number(i.quantityOnHand), 0).toFixed(3)}</strong></div>
          <div class="summary-item">Réservé <strong>${filteredByLocation.reduce((a, i) => a + i.quantityReserved, 0)}</strong></div>
          <div class="summary-item">Alertes <strong style="color:#ef4444">${stats.alerts}</strong></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Produit</th><th>Code</th><th>Emplacement</th>
              <th class="right">En stock</th><th class="right">Réservé</th>
              <th class="right">Seuil</th><th class="right">Qté réapp.</th>
              <th class="center">Statut</th><th>Dernier comptage</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">
          SmartPOS — Document généré automatiquement
          ${settings?.rcNumber ? `— RC: ${settings.rcNumber}` : ""}
          ${settings?.nifNumber ? `— NIF: ${settings.nifNumber}` : ""}
        </div>
        <script>window.onload = function() { window.print(); window.close() }<\/script>
      </body>
      </html>
    `)
        printWindow.document.close()
    }

    const getLocationIcon = (type: string) => {
        switch (type) {
            case "primary": return Warehouse
            case "store": return Store
            case "branch": return MapPin
            case "delivery_point": return Building2
            default: return Store
        }
    }

    const getStockStatus = (qty: number, reorderLevel: number) => {
        if (qty <= 0) return { label: "Rupture", color: "text-red-700 dark:text-red-400", border: "border-red-500/30", bg: "bg-red-500/10", icon: XCircle }
        if (qty <= reorderLevel) return { label: "Stock faible", color: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", icon: AlertTriangle }
        return { label: "Normal", color: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", icon: CheckCircle2 }
    }

    const getStockLevelPct = (qty: number, reorderLevel: number) => {
        if (reorderLevel <= 0) return 100
        return Math.min((qty / reorderLevel) * 100, 100)
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">État des stocks</h2>
                    <p className="text-muted-foreground">Surveiller les niveaux de stock en temps réel</p>
                </div>
                <Button variant="outline" size="sm" onClick={handlePrintStock}>
                    <Printer className="h-4 w-4 mr-1.5" />
                    Imprimer l&apos;état
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unités totales</p>
                                <p className="text-2xl font-bold tracking-tight">{stats.totalUnits}</p>
                                <p className="text-xs text-muted-foreground">{stats.products} produit{stats.products !== 1 ? "s" : ""}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                <Package className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Réservées</p>
                                <p className="text-2xl font-bold tracking-tight text-amber-600">{stats.reserved}</p>
                                <p className="text-xs text-muted-foreground">unités en attente</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                                <Clock className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Alertes stock</p>
                                <p className="text-2xl font-bold tracking-tight text-red-600">{stats.alerts}</p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-0.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> {stats.outOfStock} rupture
                                    </span>
                                    <span className="flex items-center gap-0.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {stats.lowStock} faible
                                    </span>
                                </div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Emplacements</p>
                                <p className="text-2xl font-bold tracking-tight">{locations.filter(l => l.isActive).length}</p>
                                <p className="text-xs text-muted-foreground">{selectedLocation?.name || "Tous"}</p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                                <MapPin className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-border/50 shadow-sm">
                <CardContent className="p-4">
                    <div className="space-y-3">
                        {/* Location filter */}
                        <div className="flex flex-wrap gap-1.5">
                            <Button
                                variant={!selectedLocationId ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedLocationId(null)}
                                className="h-8"
                            >
                                <Warehouse className="h-3.5 w-3.5 mr-1.5" />
                                Tous
                            </Button>
                            {locations.filter(l => l.isActive).map((loc) => {
                                const Icon = getLocationIcon(loc.type)
                                return (
                                    <Button
                                        key={loc.id}
                                        variant={selectedLocationId === loc.id ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setSelectedLocationId(loc.id)}
                                        className="h-8"
                                    >
                                        <Icon className="h-3.5 w-3.5 mr-1.5" />
                                        {loc.name}
                                    </Button>
                                )
                            })}
                        </div>

                        <Separator />

                        {/* Product type + search */}
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap gap-1.5">
                                <Button
                                    variant={productType === "all" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setProductType("all")}
                                    className="h-8"
                                >
                                    Tous
                                </Button>
                                {activeTypes.map((t) => (
                                    <Button
                                        key={t.id}
                                        variant={productType === t.id ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setProductType(t.id)}
                                        className="h-8"
                                    >
                                        {t.name}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Rechercher par produit ou SKU..."
                                        value={search}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="pl-9 h-9 w-64"
                                    />
                                </div>
                                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                                    <SelectTrigger className="w-[100px] h-9">
                                        <SelectValue placeholder="Lignes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Inventory Adjustment Form (bakery users) */}
            {isBakeryUser && (
                <Card className="border-border/50 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Warehouse className="h-4 w-4 text-muted-foreground" />
                            Ajustement d&apos;inventaire
                        </CardTitle>
                        <CardDescription>
                            Saisissez la quantité physique pour mettre à jour le stock
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <form onSubmit={handleInventorySubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div className="md:col-span-2 space-y-2">
                                <Label className="text-sm">Produit</Label>
                                <Select
                                    value={inventoryForm.productId}
                                    onValueChange={(val) => setInventoryForm({ ...inventoryForm, productId: val })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Sélectionner un produit..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bakeryProducts.map((item) => (
                                            <SelectItem key={item.productId} value={item.productId}>
                                                <div className="flex items-center gap-2">
                                                    <span>{item.product.name}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{item.product.sku}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm">Quantité physique</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.001"
                                    placeholder="0.000"
                                    value={inventoryForm.physicalQuantity}
                                    onChange={(e) => setInventoryForm({ ...inventoryForm, physicalQuantity: e.target.value })}
                                    className="h-10"
                                />
                            </div>
                            <Button type="submit" disabled={isSubmitting || !inventoryForm.productId} className="h-10">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Mettre à jour
                            </Button>
                        </form>

                        {/* Variance display */}
                        {selectedStockItem && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="p-3 rounded-lg border border-border/50 bg-muted/20">
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Stock logique</p>
                                    <p className="text-xl font-bold mt-1">{logicalQty.toFixed(3)}</p>
                                </div>
                                <div className={`p-3 rounded-lg border ${variance < 0 ? "border-red-500/30 bg-red-500/5" : variance > 0 ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/50 bg-muted/20"}`}>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Différence</p>
                                    <p className={`text-xl font-bold mt-1 flex items-center gap-1.5 ${variance < 0 ? "text-red-600" : variance > 0 ? "text-emerald-600" : ""}`}>
                                        {variance < 0 ? <TrendingDown className="h-4 w-4" /> : variance > 0 ? <TrendingUp className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                                        {variance > 0 ? "+" : ""}{variance.toFixed(3)}
                                    </p>
                                </div>
                                <div className={`p-3 rounded-lg border ${loss > 0 ? "border-red-500/30 bg-red-500/5" : "border-border/50 bg-muted/20"}`}>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Perte</p>
                                    <p className={`text-xl font-bold mt-1 ${loss > 0 ? "text-red-600" : ""}`}>{loss.toFixed(3)}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Tabs: Stock Journal + History */}
            <Tabs defaultValue="journal" className="space-y-0">
                <TabsList>
                    <TabsTrigger value="journal" className="gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5" /> Journal des stocks
                        <Badge variant="secondary" className="text-xs px-1.5 ml-1">{filteredInventory.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Historique des inventaires
                        <Badge variant="secondary" className="text-xs px-1.5 ml-1">
                            {(adjustments || []).filter(a => a.reason === "Inventaire physique").length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                {/* Stock Journal Tab */}
                <TabsContent value="journal" className="mt-4">
                    <Card className="border-border/50 shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 border-border">
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produit</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Emplacement</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">En stock</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Réservé</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Seuil réapp.</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Niveau</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dernier comptage</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                        <span className="text-sm text-muted-foreground">Analyse de l&apos;inventaire...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : filteredInventory.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                                        <p className="text-sm font-medium text-muted-foreground">Aucun produit trouvé</p>
                                                        <p className="text-xs text-muted-foreground/60 mt-1">
                                                            {search ? "Essayez de modifier votre recherche" : "Aucun stock disponible pour les filtres sélectionnés"}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedInventory.map((item) => {
                                                const qty = Number(item.quantityOnHand)
                                                const status = getStockStatus(qty, item.reorderLevel)
                                                const StatusIcon = status.icon
                                                const pct = getStockLevelPct(qty, item.reorderLevel)
                                                const LocIcon = getLocationIcon(item.location?.type || "store")

                                                return (
                                                    <TableRow key={item.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                                                        <TableCell>
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                                    <Package className="h-4 w-4 text-primary" />
                                                                </div>
                                                                <span className="text-sm font-medium">{item.product.name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-mono text-xs text-muted-foreground">{item.product.sku}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="h-5 w-5 rounded-md bg-muted flex items-center justify-center">
                                                                    <LocIcon className="h-3 w-3 text-muted-foreground" />
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">{item.location?.name || "—"}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="text-sm font-bold">
                                                                {item.product?.sellingUnits?.length > 0
                                                                    ? formatStockFromSellingUnits(qty, item.product.sellingUnits)
                                                                    : qty}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="text-sm text-muted-foreground">{item.quantityReserved}</span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <span className="text-xs text-muted-foreground">{item.reorderLevel}</span>
                                                        </TableCell>
                                                        <TableCell className="w-32">
                                                            <div className="space-y-1">
                                                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all duration-300 ${
                                                                            qty <= 0 ? "bg-red-500" : qty <= item.reorderLevel ? "bg-amber-500" : "bg-emerald-500"
                                                                        }`}
                                                                        style={{ width: `${Math.min(pct, 100)}%` }}
                                                                    />
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground">{qty > 0 ? `${Math.round(pct)}%` : "—"}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline" className={`text-[10px] gap-1 py-0.5 ${status.color} ${status.border} ${status.bg}`}>
                                                                <StatusIcon className="h-3 w-3" /> {status.label}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.lastCountedDate ? (
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {new Date(item.lastCountedDate).toLocaleDateString()}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground/50 flex items-center gap-1">
                                                                    <AlertTriangle className="h-3 w-3" /> Jamais
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {filteredInventory.length > 0 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                                    <div className="text-sm text-muted-foreground">
                                        {Math.min((currentPage - 1) * pageSize + 1, filteredInventory.length)}–{Math.min(currentPage * pageSize, filteredInventory.length)} sur {filteredInventory.length}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                                            <span className="sr-only">Précédent</span>
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                                        </Button>
                                        <span className="text-sm font-medium mx-2 min-w-[4rem] text-center">{currentPage} / {totalPages}</span>
                                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                                            <span className="sr-only">Suivant</span>
                                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="mt-4">
                    <Card className="border-border/50 shadow-sm overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 border-border">
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Produit</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Avant</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Après</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Variation</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Perte</TableHead>
                                            <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                        <span className="text-sm text-muted-foreground">Chargement de l&apos;historique...</span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (adjustments || []).filter(a => a.reason === "Inventaire physique").length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="h-48 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <Clock className="h-12 w-12 text-muted-foreground/30 mb-3" />
                                                        <p className="text-sm font-medium text-muted-foreground">Aucun inventaire effectué</p>
                                                        <p className="text-xs text-muted-foreground/60 mt-1">Les ajustements d&apos;inventaire apparaîtront ici</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            (adjustments || [])
                                                .filter(a => a.reason === "Inventaire physique")
                                                .map((adj) => {
                                                    const notesMatch = adj.notes?.match(/Stock avant: ([\d.]+), Stock après: ([\d.]+)/);
                                                    const before = notesMatch ? parseFloat(notesMatch[1]) : (adj.adjustmentType === "addition" ? 0 : Math.abs(adj.quantityChange));
                                                    const after = notesMatch ? parseFloat(notesMatch[2]) : (adj.adjustmentType === "addition" ? adj.quantityChange : 0);
                                                    const diff = after - before;
                                                    const itemLoss = diff < 0 ? Math.abs(diff) : 0;

                                                    return (
                                                        <TableRow key={adj.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                                                            <TableCell>
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${itemLoss > 0 ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                                                                        {itemLoss > 0 ? (
                                                                            <TrendingDown className="h-4 w-4 text-red-600" />
                                                                        ) : (
                                                                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                                        )}
                                                                    </div>
                                                                    <span className="text-sm font-medium">{adj.product?.name || adj.productName}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right text-sm">{before.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right text-sm font-semibold">{after.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right">
                                                                <span className={`text-sm font-medium flex items-center justify-end gap-1 ${diff < 0 ? "text-red-600" : diff > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                                                                    {diff < 0 ? <TrendingDown className="h-3 w-3" /> : diff > 0 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                                                    {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {itemLoss > 0 ? (
                                                                    <Badge variant="outline" className="text-xs border-red-500/30 bg-red-500/10 text-red-700 gap-1">
                                                                        <TrendingDown className="h-3 w-3" /> {itemLoss.toFixed(2)}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                                    <Calendar className="h-3 w-3" />
                                                                    {new Date(adj.createdDate).toLocaleDateString()}
                                                                    <span className="text-muted-foreground/50">
                                                                        {new Date(adj.createdDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
