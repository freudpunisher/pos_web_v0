"use client"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Truck, Package, DollarSign, Clock, Building2, Phone, Mail, MapPin,
  Loader2, AlertCircle, Plus, PowerOff, Power, Edit, Printer, Search,
  X, Send, ArrowRight, Calendar, Hash, Eye
} from "lucide-react"
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
  }, [orders, productFilter, startDate, endDate])

  const pendingCount = orders.filter((po) => po.status === "pending").length
  const receivedCount = orders.filter((po) => po.status === "received").length
  const cancelledCount = orders.filter((po) => po.status === "cancelled").length
  const totalValue = orders.reduce((sum, po) => sum + (parseFloat(po.total) || 0), 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return (
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1">
            <Package className="h-3 w-3" /> Reçu
          </Badge>
        )
      case "pending":
        return (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 gap-1">
            <Clock className="h-3 w-3" /> En attente
          </Badge>
        )
      case "cancelled":
        return (
          <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 gap-1">
            Annulé
          </Badge>
        )
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
          <p className="text-sm text-muted-foreground">Chargement des achats et fournisseurs...</p>
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Achats</h2>
          <p className="text-muted-foreground">Gérer les fournisseurs et les commandes d&apos;achat</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={filteredOrders.length === 0}>
            <Printer className="h-4 w-4 mr-1.5" /> Imprimer
          </Button>
          <Button size="sm" onClick={() => router.push("/purchases/create")} className="gap-2">
            <Plus className="h-4 w-4" /> Nouvelle commande
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fournisseurs</p>
                <p className="text-2xl font-bold tracking-tight">{suppliers.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">En attente</p>
                <p className="text-2xl font-bold tracking-tight text-amber-600">{pendingCount}</p>
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
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reçues</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-600">{receivedCount}</p>
                {receivedCount > 0 && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Send className="h-3 w-3" /> À distribuer
                  </p>
                )}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Package className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valeur totale</p>
                <p className="text-2xl font-bold tracking-tight">{formatCurrency(totalValue)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
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
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36 h-10" />
                <span className="text-muted-foreground text-sm">—</span>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36 h-10" />
              </div>
              {(startDate || endDate) && (
                <Button variant="ghost" size="icon" onClick={() => { setStartDate(""); setEndDate("") }} className="h-10 w-10">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="gap-1.5">
            Commandes
            <Badge variant="secondary" className="text-xs px-1.5 ml-1">{filteredOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1.5">
            Fournisseurs
            <Badge variant="secondary" className="text-xs px-1.5 ml-1">{suppliers.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-border">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Référence</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Fournisseur</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Articles</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Total</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">Aucune commande trouvée</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Créez votre première commande d&apos;achat</p>
                            <Button size="sm" className="mt-4" onClick={() => router.push("/purchases/create")}>
                              <Plus className="h-4 w-4 mr-1.5" /> Nouvelle commande
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order) => (
                        <TableRow
                          key={order.id}
                          className="cursor-pointer hover:bg-muted/30 transition-colors border-border"
                          onClick={() => router.push(`/purchases/${order.id}`)}
                        >
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">
                              {order.purchaseRef || order.id.slice(0, 8) + "…"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm whitespace-nowrap">{new Date(order.date).toLocaleDateString()}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{order.supplierName || "—"}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-normal">
                              <Hash className="h-3 w-3 mr-0.5" />
                              {order.items?.length || 0} articles
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-semibold">{formatCurrency(parseFloat(order.total) || 0)}</span>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(order.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {order.status === "received" && (
                                <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs border-blue-500/30">
                                  <Send className="h-3 w-3 mr-0.5" /> À distribuer
                                </Badge>
                              )}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); router.push(`/purchases/${order.id}`) }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={handleAddSupplier} variant="outline" size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              Ajouter un fournisseur
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((supplier) => (
              <Card
                key={supplier.id}
                className={`border-border/50 shadow-sm transition-all ${!supplier.isActive ? "opacity-60" : "hover:shadow-md hover:border-border"}`}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                            supplier.isActive ? "bg-primary/10" : "bg-muted"
                          }`}
                        >
                          <Building2
                            className={`h-5 w-5 ${supplier.isActive ? "text-primary" : "text-muted-foreground"}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate">{supplier.name}</h3>
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 mt-0.5 ${
                            supplier.isActive
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                              : "border-gray-300 bg-gray-100 text-gray-600"
                          }`}>
                            {supplier.isActive ? "Actif" : "Inactif"}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {supplier.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 shrink-0" /> {supplier.phone}
                          </div>
                        )}
                        {supplier.address && (
                          <div className="flex items-start gap-1.5">
                            <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" /> <span className="line-clamp-2">{supplier.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0 ml-2">
                      <div className="flex gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditSupplier(supplier)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 ${supplier.isActive ? "text-red-600 hover:text-red-700" : "text-emerald-600 hover:text-emerald-700"}`}
                          onClick={() => handleToggleStatus(supplier)}
                        >
                          {supplier.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
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
