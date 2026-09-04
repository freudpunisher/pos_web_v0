"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2, Printer, MapPin, Building2, Warehouse, Banknote } from "lucide-react"
import { useTransactions } from "@/hooks/use-transactions"
import { useProducts } from "@/hooks/use-products"
import { useUsers } from "@/hooks/use-users"
import { useLocations } from "@/hooks/use-locations"
import { useStock } from "@/hooks/use-stock"
import { useSettings } from "@/hooks/use-settings"
import { useAuth } from "@/lib/auth-context"

const fmt = (n: number) => n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " FC"
const fmtQty = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 2 })

function printReport(
  title: string,
  store: { name: string; address: string; phone: string },
  columns: string[],
  rows: string[][],
  colAligns: string[],
  footerTotals: string[],
  filterInfo: string,
  cashTotal: number,
) {
  const alignStyle = (i: number) => {
    switch (colAligns[i]) {
      case "right": return "text-align: right;"
      case "center": return "text-align: center;"
      default: return "text-align: left;"
    }
  }

  const headerHtml = columns
    .map((h, i) => `<th style="${alignStyle(i)} padding: 10px 14px; border-bottom: 2px solid #1e293b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; font-weight: 700; white-space: nowrap;">${h}</th>`)
    .join("")

  const bodyHtml = rows
    .map((row, ri) => `<tr>${row
      .map((cell, ci) => `<td style="${alignStyle(ci)} padding: 8px 14px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #1e293b; ${ri % 2 === 0 ? "background: #f8fafc;" : ""}">${cell}</td>`)
      .join("")}</tr>`)
    .join("")

  const footerHtml = footerTotals.length
    ? `<tr style="font-weight: 700; border-top: 2px solid #1e293b;">${footerTotals
        .map((c, i) => `<td style="${alignStyle(i)} padding: 10px 14px; font-size: 12px; color: #0f172a; background: #f1f5f9;">${c}</td>`)
        .join("")}</tr>`
    : ""

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { margin: 12mm 8mm; size: A4 landscape; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.6;
      padding: 0;
    }
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #1e293b;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .store-info h1 { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; }
    .store-info p { font-size: 11px; color: #64748b; margin-top: 2px; }
    .report-meta { text-align: right; font-size: 11px; color: #64748b; line-height: 1.8; }
    .report-meta strong { color: #0f172a; }
    .report-title {
      text-align: center;
      margin-bottom: 16px;
    }
    .report-title h2 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; }
    .report-title p { font-size: 11px; color: #94a3b8; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; }
    td, th { vertical-align: middle; }
    .grand-total {
      margin-top: 20px;
      text-align: right;
      font-size: 14px;
      font-weight: 700;
      padding: 12px 16px;
      background: #f1f5f9;
      border-radius: 6px;
    }
    .footer {
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="store-info">
      <h1>${store.name}</h1>
      <p>${store.address} &mdash; Tél : ${store.phone}</p>
    </div>
    <div class="report-meta">
      <div><strong>Date :</strong> ${new Date().toLocaleDateString("fr-FR")}</div>
      <div><strong>Période :</strong> ${filterInfo}</div>
    </div>
  </div>

  <div class="report-title">
    <h2>${title}</h2>
    <p>Rapport généré le ${new Date().toLocaleString("fr-FR")}</p>
  </div>

  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml}${footerHtml}</tbody>
  </table>

  <div style="display:flex;gap:24px;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:2px solid #e2e8f0">
    <div style="text-align:right">
      <span style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600">Total encaissé (Espèces)</span>
      <div style="font-size:16px;font-weight:700;color:#059669">${fmt(cashTotal)}</div>
    </div>
  </div>
  <div class="footer">
    ${store.name} &mdash; Document généré par Smart POS
  </div>

  <script>
    window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
  <\/script>
</body>
</html>`

  const win = window.open("", "_blank", "width=1100,height=700,scrollbars=yes")
  if (!win) { alert("Veuillez autoriser les popups pour imprimer"); return }
  win.document.write(html)
  win.document.close()
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [timeFrom, setTimeFrom] = useState("")
  const [timeTo, setTimeTo] = useState("")
  const [selectedUserId, setSelectedUserId] = useState("all")
  const [locationFilter, setLocationFilter] = useState("all")

  const { transactions, loading: txLoading, fetchTransactions } = useTransactions()
  const { products, loading: productsLoading } = useProducts()
  const { users } = useUsers()
  const { locations } = useLocations()
  const { settings } = useSettings()

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin"

  useEffect(() => {
    if (user?.role === "cashier") {
      fetchTransactions(undefined, undefined, user.id)
    } else {
      fetchTransactions()
    }
  }, [fetchTransactions, user])

  const storeLocation = useMemo(() => locations.find(l => l.type === "store"), [locations])

  const { stockItems: storeStock, loading: storeLoading } = useStock(storeLocation?.id, !!storeLocation?.id)

  const storeStockMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of storeStock) map[s.productId] = Number(s.quantityOnHand)
    return map
  }, [storeStock])

  const completedSales = useMemo(() =>
    transactions.filter((t: any) => t.type === "sale" && t.status === "completed"),
    [transactions]
  )

  const isLoading = txLoading || productsLoading || storeLoading

  const filteredTransactions = useMemo(() => {
    return completedSales.filter((t: any) => {
      const d = new Date(t.date)
      if (dateFrom && d < new Date(dateFrom)) return false
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        if (d > end) return false
      }
      if (timeFrom && timeTo) {
        const [h1, m1] = timeFrom.split(":").map(Number)
        const [h2, m2] = timeTo.split(":").map(Number)
        const tStart = h1 * 60 + m1
        const tEnd = h2 * 60 + m2
        const tVal = d.getHours() * 60 + d.getMinutes()
        if (tStart <= tEnd) {
          if (tVal < tStart || tVal > tEnd) return false
        } else {
          if (tVal < tStart && tVal > tEnd) return false
        }
      } else {
        if (timeFrom) {
          const [h, m] = timeFrom.split(":").map(Number)
          const tMin = h * 60 + m
          const tVal = d.getHours() * 60 + d.getMinutes()
          if (tVal < tMin) return false
        }
        if (timeTo) {
          const [h, m] = timeTo.split(":").map(Number)
          const tMax = h * 60 + m
          const tVal = d.getHours() * 60 + d.getMinutes()
          if (tVal > tMax) return false
        }
      }
      if (selectedUserId !== "all" && t.userId !== selectedUserId) return false
      if (isManagerOrAdmin && locationFilter !== "all" && t.locationId !== locationFilter) return false
      return true
    })
  }, [completedSales, dateFrom, dateTo, timeFrom, timeTo, selectedUserId, locationFilter, isManagerOrAdmin])

  const productSalesQty = useMemo(() => {
    const map: Record<string, { sold: number; total: number; name: string }> = {}
    for (const t of filteredTransactions) {
      const items = t.items || []
      for (const item of items) {
        const pid = item.productId
        if (!map[pid]) {
          const prod = products.find((p: any) => p.id === pid)
          map[pid] = { sold: 0, total: 0, name: item.productName || prod?.name || pid }
        }
        const qty = Number(item.quantity) || 0
        map[pid].sold += qty
        map[pid].total += qty * Number(item.price)
      }
    }
    return map
  }, [filteredTransactions, products])

  const productRows = useMemo(() => {
    return Object.entries(productSalesQty).sort((a, b) => b[1].total - a[1].total)
  }, [productSalesQty])

  const cashTotal = useMemo(() => {
    return filteredTransactions.reduce((sum: number, t: any) => sum + (Number(t.total) || 0), 0)
  }, [filteredTransactions])

  const grandTotal = useMemo(() =>
    productRows.reduce((sum, [_, { total }]) => sum + total, 0),
    [productRows]
  )

  const filterDesc = useMemo(() => {
    const parts: string[] = []
    if (dateFrom && dateTo) parts.push(`${dateFrom} → ${dateTo}`)
    else if (dateFrom) parts.push(`Depuis ${dateFrom}`)
    else if (dateTo) parts.push(`Jusqu'au ${dateTo}`)
    if (timeFrom && timeTo) parts.push(`${timeFrom} - ${timeTo}`)
    if (selectedUserId !== "all") {
      const u = users.find((u: any) => u.id === selectedUserId)
      if (u) parts.push(`Par ${u.name}`)
    }
    if (isManagerOrAdmin && locationFilter !== "all") {
      const loc = locations.find((l: any) => l.id === locationFilter)
      if (loc) parts.push(`Emplacement : ${loc.name}`)
    }
    return parts.length ? parts.join(" | ") : "Toute la période"
  }, [dateFrom, dateTo, timeFrom, timeTo, selectedUserId, locationFilter, users, locations, isManagerOrAdmin])

  const storeInfo = useMemo(() => ({
    name: settings?.name || "Smart POS",
    address: settings?.address || "",
    phone: settings?.phone || "",
  }), [settings])

  const handlePrint = () => {
    const columns = ["Produit", "Stock en magasin", "Qté vendue", "Prix unitaire", "Total"]
    const aligns = ["left", "right", "right", "right", "right"]
    const rows = productRows.map(([pid, { name, sold, total }]) => [
      name,
      fmtQty(storeStockMap[pid] ?? 0),
      fmtQty(sold),
      fmt(sold > 0 ? total / sold : 0),
      fmt(total),
    ])
    const footer = ["", "", "", "TOTAL", fmt(grandTotal)]
    printReport("Rapport des ventes par produit", storeInfo, columns, rows, aligns, footer, filterDesc, cashTotal)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Rapport des ventes par produit</h2>
          <p className="text-muted-foreground">Consultez les quantités vendues, les stocks et les encaissements par produit</p>
        </div>
        {user?.role !== "cashier" && (
          <Button variant="outline" onClick={handlePrint} disabled={productRows.length === 0} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimer le rapport
          </Button>
        )}
      </div>

      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Date de début</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Date de fin</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label>Heure de début</Label>
              <Input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className="w-32" />
            </div>
            <div className="space-y-2">
              <Label>Heure de fin</Label>
              <Input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className="w-32" />
            </div>
            {user?.role !== "cashier" && (
              <div className="space-y-2">
                <Label>Utilisateur</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Tous les utilisateurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    {users.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isManagerOrAdmin && (
              <div className="space-y-2">
                <Label>Emplacement</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Tous les emplacements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" /> Tous les emplacements
                      </span>
                    </SelectItem>
                    {locations.map((loc: any) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        <span className="flex items-center gap-2">
                          {loc.type === "primary" ? <Warehouse className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                          {loc.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total encaissé (Espèces)</p>
            <p className="text-2xl font-bold text-foreground mt-1">{fmt(cashTotal)}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Banknote className="h-5 w-5 text-emerald-600" />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Card className="border-border bg-card">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Banknote className="h-5 w-5 text-primary" />
              Ventes par produit
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wider">Produit</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Stock en magasin</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Qté vendue</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Prix</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Aucune vente trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  productRows.map(([pid, { name, sold, total }]) => {
                    const price = sold > 0 ? total / sold : 0
                    return (
                      <TableRow key={pid} className="border-border/60">
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell className="text-right">{fmtQty(storeStockMap[pid] ?? 0)}</TableCell>
                        <TableCell className="text-right">{fmtQty(sold)}</TableCell>
                        <TableCell className="text-right">{fmt(price)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmt(total)}</TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
              {productRows.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell colSpan={4} className="text-right uppercase text-xs tracking-wider">Total</TableCell>
                    <TableCell className="text-right">{fmt(grandTotal)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
