"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency } from "@/lib/mock-data"
import { ChevronLeft, ChevronRight, Loader2, Search, RefreshCw } from "lucide-react"

export default function PaymentsHistoryPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [type, setType] = useState("all")
  const [category, setCategory] = useState("all")
  const [referenceType, setReferenceType] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const fetchRows = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (type !== "all") params.set("type", type)
      if (category !== "all") params.set("category", category)
      if (referenceType !== "all") params.set("referenceType", referenceType)
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)

      const res = await fetch(`/api/cash-flow?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to fetch payments history")
      setRows(await res.json())
      setCurrentPage(1) // Reset to first page on new fetch
    } catch (error) {
      console.error(error)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
  }, [type, category, referenceType, startDate, endDate])

  const totals = useMemo(() => {
    const inflow = rows
      .filter((item) => item.type === "inflow")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    const outflow = rows
      .filter((item) => item.type === "outflow")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
    return { inflow, outflow, net: inflow - outflow }
  }, [rows])

  // Pagination logic
  const totalPages = Math.ceil(rows.length / itemsPerPage)
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return rows.slice(start, start + itemsPerPage)
  }, [rows, currentPage])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Historique des paiements</h2>
          <p className="text-muted-foreground">Traçabilité des encaissements et décaissements</p>
        </div>
        <Button variant="outline" onClick={fetchRows} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Encaissements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totals.inflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Décaissements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.outflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Solde net</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totals.net >= 0 ? "text-primary" : "text-destructive"}`}>
              {formatCurrency(totals.net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-7">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchRows()}
                className="pl-10"
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous types</SelectItem>
                <SelectItem value="inflow">Entrée</SelectItem>
                <SelectItem value="outflow">Sortie</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes catégories</SelectItem>
                <SelectItem value="sales">Ventes</SelectItem>
                <SelectItem value="purchases">Achats</SelectItem>
                <SelectItem value="expenses">Dépenses</SelectItem>
                <SelectItem value="other">Autres</SelectItem>
              </SelectContent>
            </Select>
            <Select value={referenceType} onValueChange={setReferenceType}>
              <SelectTrigger><SelectValue placeholder="Référence" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes références</SelectItem>
                <SelectItem value="transaction">Facture</SelectItem>
                <SelectItem value="credit_payment">Paiement crédit</SelectItem>
                <SelectItem value="expense">Dépense</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="inline-flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Chargement...
                    </div>
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Aucun paiement trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.date).toLocaleString()}</TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">{item.referenceCode || item.referenceId || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.type === "inflow" ? "default" : "destructive"}>
                        {item.type === "inflow" ? "Entrée" : "Sortie"}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className={`text-right font-medium ${item.type === "inflow" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      {formatCurrency(Number(item.amount || 0))}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination UI */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-4">
              <div className="text-sm text-muted-foreground">
                Affichage de {(currentPage - 1) * itemsPerPage + 1} à {Math.min(currentPage * itemsPerPage, rows.length)} sur {rows.length} résultats
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  )).filter((_, i) => {
                    // Show current page, first, last, and neighbors
                    const dist = Math.abs(i + 1 - currentPage)
                    return dist < 2 || i === 0 || i === totalPages - 1
                  }).map((item, i, arr) => {
                    // Add ellipsis if needed
                    // This is a bit complex for a simple map, but let's just show standard buttons for now if few pages
                    return item
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
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
