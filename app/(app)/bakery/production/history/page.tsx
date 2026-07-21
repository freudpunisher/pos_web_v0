"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Factory, Calendar, User, TrendingUp, Package } from "lucide-react"
import { formatCurrency } from "@/lib/mock-data"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const getMonthStart = () => {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  return start.toISOString().slice(0, 10)
}

const getMonthEnd = () => {
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return end.toISOString().slice(0, 10)
}

export default function ProductionHistoryPage() {
  const [runs, setRuns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(getMonthStart)
  const [dateTo, setDateTo] = useState(getMonthEnd)
  const [granularity, setGranularity] = useState<"day" | "week" | "month">("month")

  useEffect(() => {
    const fetchRuns = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/production")
        if (res.ok) {
          setRuns(await res.json())
        }
      } finally {
        setLoading(false)
      }
    }
    fetchRuns()
  }, [])

  const dateStart = dateFrom ? new Date(dateFrom) : null
  const dateEnd = dateTo ? new Date(dateTo) : null
  if (dateEnd) dateEnd.setHours(23, 59, 59, 999)

  const isInRange = (dateStr?: string | null) => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (dateStart && d < dateStart) return false
    if (dateEnd && d > dateEnd) return false
    return true
  }

  const filteredRuns = useMemo(() => {
    return runs.filter((r) => isInRange(r.endDate || r.startDate))
  }, [runs, dateFrom, dateTo])

  useEffect(() => {
    const now = new Date()
    if (granularity === "day") {
      const today = now.toISOString().slice(0, 10)
      setDateFrom(today)
      setDateTo(today)
      return
    }
    if (granularity === "week") {
      const day = now.getDay()
      const diffToMonday = (day + 6) % 7
      const monday = new Date(now)
      monday.setDate(now.getDate() - diffToMonday)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      setDateFrom(monday.toISOString().slice(0, 10))
      setDateTo(sunday.toISOString().slice(0, 10))
      return
    }
    setDateFrom(getMonthStart())
    setDateTo(getMonthEnd())
  }, [granularity])

  const handleExport = () => {
    const header = ["Batch", "Recipe", "Product", "Quantity", "Cost", "Date", "User", "Status"]
    const rows = filteredRuns.map((run) => [
      run.batchNumber || run.id?.slice(0, 8),
      run.recipe?.name || "",
      run.recipe?.product?.name || "",
      `${Number(run.actualQuantity || run.plannedQuantity || 0)} ${run.recipe?.product?.unit || ""}`.trim(),
      run.productionCost ? Number(run.productionCost) : "",
      run.endDate ? new Date(run.endDate).toLocaleString() : "",
      run.user?.name || "",
      run.status || "",
    ])
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "production-history.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const totals = useMemo(() => {
    const totalQty = filteredRuns.reduce(
      (sum, r) => sum + Number(r.actualQuantity || r.plannedQuantity || 0),
      0
    )
    const totalCost = filteredRuns.reduce((sum, r) => sum + Number(r.productionCost || 0), 0)
    return { totalQty, totalCost }
  }, [filteredRuns])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historique des productions</h1>
        <p className="text-muted-foreground">Suivi des productions réalisées et coûts associés.</p>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Du</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Au</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Période</Label>
              <Select value={granularity} onValueChange={(v) => setGranularity(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Jour</SelectItem>
                  <SelectItem value="week">Semaine</SelectItem>
                  <SelectItem value="month">Mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto">
              <Button variant="outline" onClick={handleExport}>
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quantité totale</p>
                <p className="text-2xl font-bold">{totals.totalQty}</p>
              </div>
              <Package className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Coût total</p>
                <p className="text-2xl font-bold text-accent">{formatCurrency(totals.totalCost)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Production Runs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Batch</TableHead>
                  <TableHead className="text-muted-foreground">Recipe</TableHead>
                  <TableHead className="text-muted-foreground">Produit</TableHead>
                  <TableHead className="text-muted-foreground text-right">Quantité</TableHead>
                  <TableHead className="text-muted-foreground text-right">Coût</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Par</TableHead>
                  <TableHead className="text-muted-foreground">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Aucune production enregistrée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRuns.map((run) => (
                    <TableRow key={run.id} className="border-border">
                      <TableCell className="font-mono text-xs">{run.batchNumber || run.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">{run.recipe?.name || "—"}</TableCell>
                      <TableCell>{run.recipe?.product?.name || "—"}</TableCell>
                      <TableCell className="text-right">
                        {Number(run.actualQuantity || run.plannedQuantity)} {run.recipe?.product?.unit || ""}
                      </TableCell>
                      <TableCell className="text-right">
                        {run.productionCost ? formatCurrency(Number(run.productionCost)) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span>{run.endDate ? new Date(run.endDate).toLocaleString() : "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{run.user?.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {run.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
