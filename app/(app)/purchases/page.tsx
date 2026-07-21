"use client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePurchases } from "@/hooks/use-purchases"
import { useSuppliers } from "@/hooks/use-suppliers"
import { formatCurrency } from "@/lib/mock-data"
import { printReport } from "@/lib/print-report"
import { SupplierFormDialog } from "@/components/inventory/supplier-form-dialog"
import { Truck, Package, DollarSign, Clock, Building2, Phone, Mail, MapPin, Loader2, AlertCircle, Plus, PowerOff, Power, Edit, Printer, Search, X } from "lucide-react"
import { useState, useMemo } from "react"

export default function PurchasesPage() {
  const router = useRouter()

  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null)

  const { orders, loading: ordersLoading, error: ordersError } = usePurchases()
  const {
    suppliers,
    loading: suppliersLoading,
    error: suppliersError,
    createSupplier,
    updateSupplier,
    toggleSupplierStatus
  } = useSuppliers()

  const [sectorFilter, setSectorFilter] = useState("all")
  const [productFilter, setProductFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const productNames = useMemo(() => {
    const set = new Set<string>()
    orders.forEach((po) => (po.items || []).forEach((i: any) => set.add(i.productName)))
    return Array.from(set).sort()
  }, [orders])

  const filteredOrders = useMemo(() => {
    let filtered = orders
    if (sectorFilter !== "all") {
      filtered = filtered.filter((po) => po.sector === sectorFilter)
    }
    if (productFilter !== "all") {
      filtered = filtered.filter((po) =>
        (po.items || []).some((i: any) => i.productName === productFilter)
      )
    }
    if (startDate) {
      const s = new Date(startDate); s.setHours(0, 0, 0, 0)
      filtered = filtered.filter((po) => new Date(po.date) >= s)
    }
    if (endDate) {
      const e = new Date(endDate); e.setHours(23, 59, 59, 999)
      filtered = filtered.filter((po) => new Date(po.date) <= e)
    }
    return filtered
  }, [orders, sectorFilter, productFilter, startDate, endDate])

  const pendingCount = orders.filter((po) => po.status === "pending").length
  const receivedCount = orders.filter((po) => po.status === "received").length
  const totalValue = orders.reduce((sum, po) => sum + (parseFloat(po.total) || 0), 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">Reçu</Badge>
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400">En attente</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400">Annulé</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleAddSupplier = () => {
    setEditingSupplier(null)
    setIsSupplierDialogOpen(true)
  }

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier)
    setIsSupplierDialogOpen(true)
  }

  const handleSupplierSubmit = async (data: any) => {
    if (editingSupplier) {
      await updateSupplier(editingSupplier.id, data)
    } else {
      await createSupplier(data)
    }
  }

  const handleToggleStatus = async (supplier: any) => {
    await toggleSupplierStatus(supplier.id, !supplier.isActive)
  }

  const handlePrint = () => {
    const origin = window.location.origin
    const periodStr = [startDate, endDate].filter(Boolean).join(" au ") || "Toutes les dates"
    printReport({
      title: "Rapport des Achats",
      subtitle: "Smart POS System",
      period: `Période : ${periodStr}`,
      logoUrl: `${origin}/ahava.png`,
      metrics: [
        { label: "Total commandes", value: String(filteredOrders.length), highlight: true },
        { label: "En attente", value: String(filteredOrders.filter((o) => o.status === "pending").length) },
        { label: "Reçues", value: String(filteredOrders.filter((o) => o.status === "received").length) },
        { label: "Valeur totale", value: formatCurrency(filteredOrders.reduce((s, o) => s + (parseFloat(o.total) || 0), 0)), highlight: true },
      ],
      columns: [
        { header: "Référence", key: "ref" },
        { header: "Date", key: "date", format: "date" },
        { header: "Fournisseur", key: "supplier" },
        { header: "Articles", key: "articles", align: "center" },
        { header: "Total", key: "total", format: "currency", align: "right" },
        { header: "Statut", key: "status" },
      ],
      rows: filteredOrders.map((o) => ({
        ref: o.purchaseRef || o.id.slice(0, 8),
        date: o.date,
        supplier: o.supplierName || "—",
        articles: o.items?.length || 0,
        total: parseFloat(o.total) || 0,
        status: o.status === "received" ? "Reçu" : o.status === "pending" ? "En attente" : o.status === "cancelled" ? "Annulé" : o.status,
      })),
    })
  }

  if (ordersLoading || suppliersLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Chargement des achats et fournisseurs...</p>
        </div>
      </div>
    )
  }

  if (ordersError || suppliersError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Card className="max-w-md border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-destructive">Erreur de chargement</h3>
              <p className="text-sm text-muted-foreground">
                Impossible de charger les achats ou fournisseurs. Vérifiez la connexion ou contactez le support.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
     <div className="flex items-center justify-between">
  <div>
    <h2 className="text-2xl font-bold text-foreground">Achats</h2>
    <p className="text-muted-foreground">Gérer les fournisseurs et les commandes d'achat</p>
  </div>
  <div className="flex gap-2">
    <Button variant="outline" onClick={handlePrint} disabled={filteredOrders.length === 0}>
      <Printer className="h-4 w-4 mr-2" /> Imprimer
    </Button>
    <Button onClick={() => router.push("/purchases/create")} className="gap-2 bg-primary hover:bg-primary/90">
      <Plus className="h-4 w-4" /> Créer une commande d'achat
    </Button>
  </div>
</div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fournisseurs</p>
                <p className="text-2xl font-bold">{suppliers.length}</p>
              </div>
              <Truck className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente</p>
                <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reçues</p>
                <p className="text-2xl font-bold text-emerald-600">{receivedCount}</p>
              </div>
              <Package className="h-8 w-8 text-emerald-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Valeur totale</p>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-36 h-10">
                <SelectValue placeholder="Secteur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous secteurs</SelectItem>
                <SelectItem value="Alimentation">Alimentation</SelectItem>
                <SelectItem value="Bar">Bar</SelectItem>
                <SelectItem value="Cuisine">Cuisine</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Select value={productFilter} onValueChange={setProductFilter}>
                <SelectTrigger className="pl-10 h-10">
                  <SelectValue placeholder="Filtrer par produit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les produits</SelectItem>
                  {productNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36 h-10" />
              <span className="text-muted-foreground">—</span>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36 h-10" />
              {(startDate || endDate) && (
                <Button variant="ghost" size="icon" onClick={() => { setStartDate(""); setEndDate("") }} className="h-10 w-10">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Commandes d'achat</TabsTrigger>
          <TabsTrigger value="suppliers">Fournisseurs</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Commandes d'achat</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Articles</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => router.push(`/purchases/${order.id}`)}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {order.purchaseRef || order.id.slice(0, 8) + "…"}
                        </TableCell>
                        <TableCell>{new Date(order.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{order.supplierName || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.items?.length || 0} articles</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(parseFloat(order.total) || 0)}
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddSupplier} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un fournisseur
            </Button>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <Card
                key={supplier.id}
                className={`transition-all ${!supplier.isActive ? "opacity-60 grayscale" : "hover:shadow-md"}`}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            supplier.isActive ? "bg-primary/10" : "bg-muted"
                          }`}
                        >
                          <Building2
                            className={`h-6 w-6 ${supplier.isActive ? "text-primary" : "text-muted-foreground"}`}
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{supplier.name}</h3>
                          <p className="text-xs text-muted-foreground font-mono">ID: {supplier.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" /> {supplier.email || "—"}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" /> {supplier.phone || "—"}
                        </div>
                        <div className="flex items-start gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 mt-0.5" /> {supplier.address || "—"}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <Badge
                        variant="outline"
                        className={`font-medium ${
                          supplier.isActive
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-gray-100 text-gray-600 border-gray-300"
                        }`}
                      >
                        {supplier.isActive ? "Actif" : "Inactif"}
                      </Badge>

                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditSupplier(supplier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(supplier)}
                          className={supplier.isActive ? "text-red-600" : "text-emerald-600"}
                        >
                          {supplier.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <SupplierFormDialog
        supplier={editingSupplier}
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
        onSubmit={handleSupplierSubmit}
      />
    </div>
  )
}
