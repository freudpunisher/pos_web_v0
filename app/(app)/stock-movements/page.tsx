"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Search, ArrowDownCircle, ArrowUpCircle, RefreshCw, ClipboardList, Filter, Loader2, Plus, Warehouse, X, ChevronLeft, ChevronRight, Printer } from "lucide-react"
import { useStockMovements } from "@/hooks/use-stock-movements"
import { useProducts } from "@/hooks/use-products"
import { useUsers } from "@/hooks/use-users"
import { useLocations } from "@/hooks/use-locations"
import { printReport } from "@/lib/print-report"

export default function StockMovementsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [productFilter, setProductFilter] = useState<string>("all")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showAddModal, setShowAddModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { movements, loading, refresh, createMovement } = useStockMovements()
  const { products, loading: productsLoading } = useProducts()
  const { users } = useUsers()
  const { locations } = useLocations()

  const [formData, setFormData] = useState({
    productId: "",
    type: "adjustment",
    quantity: "",
    notes: "",
    userId: "",
    locationId: "",
  })

  useEffect(() => {
    if (users.length > 0 && !formData.userId) {
      setFormData((prev) => ({ ...prev, userId: users[0].id }))
    }
  }, [users, formData.userId])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, typeFilter, productFilter, locationFilter, startDate, endDate])

  useEffect(() => {
    refresh({
      search: search || undefined,
      type: typeFilter !== "all" ? typeFilter : undefined,
      productId: productFilter !== "all" ? productFilter : undefined,
      locationId: locationFilter !== "all" ? locationFilter : undefined,
      dateFrom: startDate || undefined,
      dateTo: endDate || undefined,
    })
  }, [search, typeFilter, productFilter, locationFilter, startDate, endDate, refresh])

  const totalPages = Math.max(1, Math.ceil(movements.length / itemsPerPage))

  const paginatedMovements = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return movements.slice(start, start + itemsPerPage)
  }, [movements, currentPage, itemsPerPage])

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await createMovement({
        ...formData,
        quantity: parseInt(formData.quantity),
      })
      setShowAddModal(false)
      setFormData({
        productId: "",
        type: "adjustment",
        quantity: "",
        notes: "",
        userId: users[0]?.id || "",
        locationId: "",
      })
    } catch (error) {
      console.error("Failed to add movement:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePrint = () => {
    const origin = window.location.origin
    const periodStr = [startDate, endDate].filter(Boolean).join(" au ") || "Toutes les dates"
    printReport({
      title: "Mouvements de Stock",
      subtitle: "Smart POS System",
      period: `Période : ${periodStr}`,
      logoUrl: `${origin}/ahava.png`,
      metrics: [
        { label: "Total mouvements", value: String(movements.length), highlight: true },
        { label: "Entrées", value: String(movements.filter((m) => m.type === "in").length) },
        { label: "Sorties", value: String(movements.filter((m) => m.type === "out").length) },
        { label: "Ajustements / Inventaire", value: String(movements.filter((m) => m.type === "adjustment" || m.type === "inventory").length), highlight: true },
      ],
      columns: [
        { header: "Date", key: "date", format: "date" },
        { header: "Produit", key: "product" },
        { header: "Type", key: "type" },
        { header: "Quantité", key: "qty", align: "right" },
        { header: "Emplacement", key: "location" },
        { header: "Utilisateur", key: "user" },
        { header: "Notes", key: "notes" },
      ],
      rows: movements.map((m: any) => ({
        date: m.date,
        product: m.productName || m.product?.name || "—",
        type: m.type === "in" ? "Entrée" : m.type === "out" ? "Sortie" : m.type === "adjustment" ? "Ajustement" : m.type === "transfer" ? "Transfert" : m.type === "inventory" ? "Inventaire" : m.type,
        qty: `${parseFloat(m.quantity) > 0 ? "+" : ""}${m.quantity}`,
        location: m.location?.name || m.locationId?.slice(0, 8) || "—",
        user: m.user?.name || "—",
        notes: m.notes || "—",
      })),
    })
  }

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "in":
        return <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
      case "out":
        return <ArrowUpCircle className="h-4 w-4 text-destructive" />
      case "adjustment":
        return <RefreshCw className="h-4 w-4 text-orange-500" />
      case "transfer":
        return <ArrowUpCircle className="h-4 w-4 text-blue-500" />
      case "inventory":
        return <ClipboardList className="h-4 w-4 text-purple-500" />
      default:
        return <RefreshCw className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getMovementBadge = (type: string) => {
    switch (type) {
      case "in":
        return <Badge className="bg-emerald-500/20 text-emerald-600">ENTRÉE</Badge>
      case "out":
        return <Badge className="bg-primary/20 text-primary">SORTIE</Badge>
      case "adjustment":
        return <Badge className="bg-orange-500/20 text-orange-600">Ajustement</Badge>
      case "transfer":
        return <Badge className="bg-blue-500/20 text-blue-600">Transfert</Badge>
      case "inventory":
        return <Badge className="bg-purple-500/20 text-purple-600">Inventaire</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const inboundCount = movements.filter((m) => m.type === "in").length
  const outboundCount = movements.filter((m) => m.type === "out").length
  const adjustmentCount = movements.filter((m) => m.type === "adjustment" || m.type === "inventory").length

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push("ellipsis")
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push("ellipsis")
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Mouvements de stock</h2>
          <p className="text-muted-foreground">Suivre tous les changements d&apos;inventaire</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={movements.length === 0}>
            <Printer className="h-4 w-4 mr-2" /> Imprimer
          </Button>
          <Button variant="outline" size="icon" onClick={() => refresh({
            search: search || undefined,
            type: typeFilter !== "all" ? typeFilter : undefined,
            productId: productFilter !== "all" ? productFilter : undefined,
            locationId: locationFilter !== "all" ? locationFilter : undefined,
            dateFrom: startDate || undefined,
            dateTo: endDate || undefined,
          })} disabled={loading} title="Actualiser">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un mouvement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddMovement}>
                <DialogHeader>
                  <DialogTitle>Ajouter un mouvement de stock</DialogTitle>
                  <DialogDescription>Ajuster manuellement le stock ou enregistrer un achat.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Produit</Label>
                    <Select
                      value={formData.productId}
                      onValueChange={(val) => setFormData({ ...formData, productId: val })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un produit" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} (Stock: {Number(p.stock)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(val) => setFormData({ ...formData, type: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in">ENTRÉE (Achat)</SelectItem>
                          <SelectItem value="out">SORTIE (Vente)</SelectItem>
                          <SelectItem value="adjustment">Ajustement</SelectItem>
                          <SelectItem value="transfer">Transfert</SelectItem>
                          <SelectItem value="inventory">Inventaire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantité</Label>
                      <Input
                        type="number"
                        placeholder="ex. 10 ou -5"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Entrepôt / Emplacement</Label>
                    <Select
                      value={formData.locationId}
                      onValueChange={(val) => setFormData({ ...formData, locationId: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner l'emplacement" />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc: any) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Utilisateur</Label>
                    <Select
                      value={formData.userId}
                      onValueChange={(val) => setFormData({ ...formData, userId: val })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner l'utilisateur" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      placeholder="Motif de l'ajustement..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Enregistrer le mouvement
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Entrées</p>
                <p className="text-2xl font-bold text-emerald-500">{loading ? "..." : inboundCount}</p>
              </div>
              <ArrowDownCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sorties</p>
                <p className="text-2xl font-bold text-destructive">{loading ? "..." : outboundCount}</p>
              </div>
              <ArrowUpCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ajustements</p>
                <p className="text-2xl font-bold text-orange-500">{loading ? "..." : adjustmentCount}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom de produit..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
              {search && (
                <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setSearch("")}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[155px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="in">Entrée</SelectItem>
                <SelectItem value="out">Sortie</SelectItem>
                <SelectItem value="adjustment">Ajustement</SelectItem>
                <SelectItem value="transfer">Transfert</SelectItem>
                <SelectItem value="inventory">Inventaire</SelectItem>
              </SelectContent>
            </Select>
            <Select value={productFilter} onValueChange={setProductFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Produit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les produits</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Emplacement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les emplacements</SelectItem>
                {locations.map((loc: any) => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      {/* Movements Table */}
      <Card className="border-border bg-card">
        <CardContent className="p-0">
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">Date et heure</TableHead>
                  <TableHead className="text-muted-foreground">Produit</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground text-right">Quantité</TableHead>
                  <TableHead className="text-muted-foreground">Emplacement</TableHead>
                  <TableHead className="text-muted-foreground">Utilisateur</TableHead>
                  <TableHead className="text-muted-foreground">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Chargement des mouvements...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : paginatedMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Aucun mouvement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMovements.map((movement: any) => (
                    <TableRow key={movement.id} className="border-border">
                      <TableCell><span className="font-mono text-xs text-muted-foreground">#{movement.id.slice(0, 8)}</span></TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{new Date(movement.date).toLocaleDateString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(movement.date).toLocaleTimeString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{movement.productName || movement.product?.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.type)}
                          {getMovementBadge(movement.type)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${parseFloat(movement.quantity) > 0 ? "text-accent" : "text-destructive"}`}>
                          {parseFloat(movement.quantity) > 0 ? "+" : ""}
                          {movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Warehouse className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{movement.location?.name || movement.locationId?.slice(0, 8) || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>{movement.user?.name || "Unknown"}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <span className="text-sm text-muted-foreground">{movement.notes || "-"}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {!loading && movements.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {(currentPage - 1) * itemsPerPage + 1}&ndash;{Math.min(currentPage * itemsPerPage, movements.length)} sur {movements.length}
                </span>
                <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
                  <SelectTrigger className="h-8 w-[70px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
                <span>par page</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {getPageNumbers().map((page, i) =>
                  page === "ellipsis" ? (
                    <span key={`e-${i}`} className="text-muted-foreground px-1 text-sm">...</span>
                  ) : (
                    <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(page)}>
                      {page}
                    </Button>
                  )
                )}
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
