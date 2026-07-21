"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePurchases } from "@/hooks/use-purchases"
import { formatCurrency } from "@/lib/mock-data"
import { Loader2, ShoppingCart, Plus, Search, ChevronLeft, ChevronRight } from "lucide-react"

export default function BakeryPurchasesPage() {
  const router = useRouter()
  const { orders, loading } = usePurchases()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const bakeryOrders = orders.filter((o) => o.sector === "Boulangerie")

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return bakeryOrders
    return bakeryOrders.filter((order) => {
      const ref = (order.purchaseRef || order.id || "").toLowerCase()
      const supplier = (order.supplierName || "").toLowerCase()
      const status = (order.status || "").toLowerCase()
      const total = String(order.total || "").toLowerCase()
      const date = order.date ? new Date(order.date).toLocaleDateString().toLowerCase() : ""
      return (
        ref.includes(query) ||
        supplier.includes(query) ||
        status.includes(query) ||
        total.includes(query) ||
        date.includes(query)
      )
    })
  }, [bakeryOrders, search])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handlePageSizeChange = (value: string) => {
    const nextSize = Number.parseInt(value, 10)
    setPageSize(nextSize)
    setPage(1)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">Received</Badge>
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400">Pending</Badge>
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-700 dark:text-red-400">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Achats Boulangerie</h2>
          <p className="text-muted-foreground">Historique des achats matières premières</p>
        </div>
        <Button onClick={() => router.push("/bakery/purchases/create")} className="gap-2 bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          Nouvel Achat
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b border-border/50 bg-secondary/5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Liste des achats
            </CardTitle>
            <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filtrer par référence, fournisseur..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 bg-background/50 border-border/50"
                />
              </div>
              <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                <SelectTrigger className="w-[120px] border-border/50">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 rows</SelectItem>
                  <SelectItem value="20">20 rows</SelectItem>
                  <SelectItem value="50">50 rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Aucun achat trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => (
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
                        <Badge variant="outline">{order.items?.length || 0} items</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(parseFloat(order.total) || 0)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col items-center justify-between gap-3 px-4 py-4 md:flex-row">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredOrders.length)} of{" "}
              {filteredOrders.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
