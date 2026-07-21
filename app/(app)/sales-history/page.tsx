"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/mock-data"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { useTransactions } from "@/hooks/use-transactions"
import { useClients } from "@/hooks/use-clients"
import { useAuth } from "@/lib/auth-context"
import { useSettings } from "@/hooks/use-settings"
import { PaymentDialog } from "@/components/pos/payment-dialog"
import { printThermal, type ReceiptData } from "@/lib/thermal-print"
import { printReport } from "@/lib/print-report"
import { toast } from "sonner"
import {
  Receipt, Search, DollarSign, Banknote, ShoppingCart,
  Calendar, User, Package, Loader2, Eye, Printer, CreditCard,
  TrendingUp, ArrowUpDown, ChevronDown, X, Pencil, Trash2, AlertTriangle,
  Upload, Image as ImageIcon,
} from "lucide-react"

export default function SalesHistoryPage() {
  const { user } = useAuth()
  const { settings } = useSettings()
  const { transactions, loading, fetchTransactions, updateTransaction, cancelTransaction } = useTransactions()
  const receiptRef = useRef<HTMLDivElement>(null)

  const [search, setSearch] = useState("")
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [tableFilter, setTableFilter] = useState<string>("all")
  const [waiterFilter, setWaiterFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [paymentDialog, setPaymentDialog] = useState<{ open: boolean; order: any | null }>({ open: false, order: null })
  const [editDialog, setEditDialog] = useState<{ open: boolean; transaction: any | null }>({ open: false, transaction: null })
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; transaction: any | null }>({ open: false, transaction: null })
  const [cancelReason, setCancelReason] = useState("")
  const [editItems, setEditItems] = useState<any[]>([])
  const [cancelling, setCancelling] = useState(false)
  const [proofDialog, setProofDialog] = useState<{ open: boolean; transaction: any | null }>({ open: false, transaction: null })
  const [proofFile, setProofFile] = useState<string | null>(null)
  const [creditDialog, setCreditDialog] = useState<{ open: boolean; transaction: any | null }>({ open: false, transaction: null })
  const [creditClientId, setCreditClientId] = useState("")
  const [clientSearch, setClientSearch] = useState("")
  const [converting, setConverting] = useState(false)
  const { clients: allClients } = useClients()

  const filteredClients = useMemo(() => {
    if (!clientSearch) return allClients
    const q = clientSearch.toLowerCase()
    return allClients.filter((c: any) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    )
  }, [allClients, clientSearch])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const salesTransactions = useMemo(() => {
    return transactions.filter((t: any) => t.type === "sale")
  }, [transactions])

  const tables = useMemo(() => {
    const set = new Set<string>()
    salesTransactions.forEach((t: any) => {
      if (t.table?.number) set.add(String(t.table.number))
    })
    return Array.from(set).sort((a, b) => Number(a) - Number(b))
  }, [salesTransactions])

  const waiters = useMemo(() => {
    const set = new Set<string>()
    salesTransactions.forEach((t: any) => {
      if (t.user?.name) set.add(t.user.name)
    })
    return Array.from(set).sort()
  }, [salesTransactions])

  const filteredTransactions = useMemo(() => {
    let filtered = salesTransactions

    if (statusFilter !== "all") {
      if (statusFilter === "paid") {
        filtered = filtered.filter((t: any) => t.status === "completed")
      } else if (statusFilter === "pending") {
        filtered = filtered.filter((t: any) => t.status !== "completed" && t.status !== "cancelled")
      } else if (statusFilter === "cancelled") {
        filtered = filtered.filter((t: any) => t.status === "cancelled")
      }
    }

    if (tableFilter !== "all") {
      filtered = filtered.filter((t: any) => String(t.table?.number) === tableFilter)
    }

    if (waiterFilter !== "all") {
      filtered = filtered.filter((t: any) => t.user?.name === waiterFilter)
    }

    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter((t: any) =>
        t.id.toLowerCase().includes(q) ||
        (t.reference || "").toLowerCase().includes(q) ||
        t.client?.name?.toLowerCase().includes(q) ||
        t.user?.name?.toLowerCase().includes(q) ||
        String(t.table?.number || "").includes(q)
      )
    }

    if (startDate) {
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      filtered = filtered.filter((t: any) => new Date(t.date) >= start)
    }

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      filtered = filtered.filter((t: any) => new Date(t.date) <= end)
    }

    return filtered
  }, [salesTransactions, search, startDate, endDate, statusFilter, tableFilter, waiterFilter])

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize))
  const paginatedTransactions = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredTransactions.slice(start, start + pageSize)
  }, [filteredTransactions, page, pageSize])

  useEffect(() => {
    setPage(1)
  }, [search, startDate, endDate, statusFilter, tableFilter, waiterFilter])

  const statsTransactions = useMemo(() => {
    const today = new Date()

    const start = startDate ? new Date(startDate) : new Date(today)
    start.setHours(startDate ? 0 : 0, 0, 0, 0)

    const end = endDate ? new Date(endDate) : new Date(today)
    end.setHours(endDate ? 23 : 23, 59, 59, 999)

    return salesTransactions.filter((t: any) => {
      const d = new Date(t.date)
      return d >= start && d <= end
    })
  }, [salesTransactions, startDate, endDate])

  const stats = useMemo(() => {
    const completed = statsTransactions.filter((t: any) => t.status === "completed")
    const totalRevenue = completed.reduce((sum: number, t: any) => sum + Number.parseFloat(t.total), 0)
    const cashSales = completed.filter((t: any) => t.paymentMethod === "cash").length
    const creditSales = completed.filter((t: any) => t.paymentMethod === "credit").length
    const pendingCount = statsTransactions.filter((t: any) => t.status !== "completed" && t.status !== "cancelled").length
    const totalItems = completed.reduce((sum: number, t: any) => sum + (t.items?.length || 0), 0)
    return { totalSales: completed.length, totalRevenue, cashSales, creditSales, pendingCount, totalItems }
  }, [statsTransactions])

  const handleViewDetails = (transaction: any) => {
    setSelectedTransaction(transaction)
    setShowDetails(true)
  }

  const handlePayment = async ({ paymentMethod, clientId }: { paymentMethod: "cash" | "credit"; clientId?: string }) => {
    if (!paymentDialog.order || !user) return
    try {
      const res = await fetch(`/api/orders/${paymentDialog.order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: "paid", paymentMethod, clientId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Payment failed")
      }
      toast.success(`Paiement de ${formatCurrency(Number(paymentDialog.order.total))} reçu`)
      setPaymentDialog({ open: false, order: null })
      fetchTransactions()
    } catch (err: any) {
      toast.error(err.message || "Échec du paiement")
    }
  }

  const handleEditOpen = (txn: any) => {
    setEditItems((txn.items || []).map((item: any) => ({ ...item })))
    setEditDialog({ open: true, transaction: txn })
  }

  const handleEditSave = async () => {
    if (!editDialog.transaction) return
    try {
      await updateTransaction(editDialog.transaction.id, { items: editItems })
      toast.success("Facture modifiée avec succès")
      setEditDialog({ open: false, transaction: null })
    } catch (err: any) {
      toast.error(err.message || "Échec de la modification")
    }
  }

  const handleEditItemChange = (index: number, field: string, value: string) => {
    setEditItems((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: field === "quantity" || field === "price" ? value : value }
      return updated
    })
  }

  const handleEditItemRemove = (index: number) => {
    setEditItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleProofOpen = (txn: any) => {
    setProofFile(txn.clientProof || null)
    setProofDialog({ open: true, transaction: txn })
  }

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setProofFile(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleProofSave = async () => {
    if (!proofDialog.transaction) return
    try {
      const res = await fetch(`/api/transactions/${proofDialog.transaction.id}/proof`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientProof: proofFile }),
      })
      if (!res.ok) throw new Error("Failed to save proof")
      toast.success(proofFile ? "Preuve enregistrée" : "Preuve supprimée")
      setProofDialog({ open: false, transaction: null })
      fetchTransactions()
    } catch (err: any) {
      toast.error(err.message || "Échec de l'enregistrement")
    }
  }

  const handleProofRemove = () => {
    setProofFile(null)
  }

  const handleCreditConvert = async () => {
    if (!creditDialog.transaction || !creditClientId) return
    setConverting(true)
    try {
      const res = await fetch(`/api/transactions/${creditDialog.transaction.id}/convert-credit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: creditClientId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Conversion failed")
      }
      toast.success("Facture convertie en crédit")
      setCreditDialog({ open: false, transaction: null })
      setCreditClientId("")
      setClientSearch("")
      fetchTransactions()
    } catch (err: any) {
      toast.error(err.message || "Échec de la conversion")
    } finally {
      setConverting(false)
    }
  }

  const handleCancelConfirm = async () => {
    if (!cancelDialog.transaction) return
    setCancelling(true)
    try {
      await cancelTransaction(cancelDialog.transaction.id, cancelReason || undefined)
      toast.success("Facture annulée avec succès")
      setCancelDialog({ open: false, transaction: null })
      setCancelReason("")
    } catch (err: any) {
      toast.error(err.message || "Échec de l'annulation")
    } finally {
      setCancelling(false)
    }
  }

  const handlePrintA4Invoice = (txn: any) => {
    const origin = window.location.origin
    const items = (txn.items || []).map((item: any) => ({
      designation: item.productName,
      quantite: String(item.quantity),
      prix: Number(item.price),
      total: Number(item.price) * item.quantity,
    }))
    const totalHt = items.reduce((s: number, i: any) => s + i.total, 0)
    const contactLine = [settings?.address, settings?.phone].filter(Boolean).join(" · ")
    const isCancelled = txn.status === "cancelled"
    const statusLabel = isCancelled ? "Annulé" : txn.status === "completed" ? "Payé" : "Non payé"
    const paymentLabel = txn.status !== "completed"
      ? (txn.status === "cancelled" ? "ANNULÉ" : "EN ATTENTE")
      : txn.paymentMethod === "cash" ? "Espèces"
        : txn.paymentMethod === "credit" ? "Crédit"
        : txn.paymentMethod === "credit_card" ? "Carte"
        : txn.paymentMethod || "—"
    const rcLine = settings?.rcNumber ? `RC: ${settings.rcNumber}` : ""
    const nifLine = settings?.nifNumber ? `NIF: ${settings.nifNumber}` : ""
    printReport({
      title: "FACTURE",
      subtitle: settings?.name || "SmartPOS",
      period: `N° ${txn.reference || txn.id.slice(0, 8).toUpperCase()}`,
      logoUrl: `${origin}/ahava.png`,
      cancelled: isCancelled,
      metrics: [
        { label: "Date", value: new Date(txn.date).toLocaleDateString() },
        { label: "Client", value: txn.client?.name || "Client libre" },
        { label: "Contact", value: contactLine || "—" },
        { label: "Caissier", value: txn.user?.name || "—" },
        { label: "Serveur", value: txn.waiter?.name || "—" },
        { label: "Paiement", value: paymentLabel },
        { label: "Statut", value: statusLabel, highlight: !isCancelled && txn.status !== "completed" },
        { label: "Total", value: formatCurrency(totalHt), highlight: true },
      ].concat(
        rcLine ? [{ label: "RC", value: settings.rcNumber }] : [],
        nifLine ? [{ label: "NIF", value: settings.nifNumber }] : [],
        isCancelled && txn.cancelReason ? [{ label: "Motif annulation", value: txn.cancelReason }] : [],
      ),
      columns: [
        { header: "Désignation", key: "designation" },
        { header: "Qté", key: "quantite", align: "center" },
        { header: "Prix unit.", key: "prix", format: "currency", align: "right" },
        { header: "Total", key: "total", format: "currency", align: "right" },
      ],
      rows: items,
    })
  }

  const handlePrintThermal = (txn?: any) => {
    const data = txn || selectedTransaction
    if (!data) return
    const items = (data.items || []).map((item: any) => ({
      name: item.productName,
      quantity: item.quantity,
      price: Number(item.price),
      total: Number(item.price) * item.quantity,
    }))
    printThermal({
      header: {
        name: settings?.name || "SmartPOS",
        address: settings?.address || "",
        phone: settings?.phone || "",
        rcNumber: settings?.rcNumber || "",
        nifNumber: settings?.nifNumber || "",
      },
      orderId: data.id,
      date: new Date(data.date || Date.now()),
      client: data.client?.name,
      cashier: data.user?.name,
      waiter: data.waiter?.name,
      items,
      total: Number(data.total),
      paymentMethod: data.status === "completed" ? data.paymentMethod : (data.status === "cancelled" ? "ANNULÉ" : "EN ATTENTE"),
      currencySymbol: ({ USD: "$", EUR: "€", GBP: "£", Fbu: "Fbu " } as Record<string, string>)[settings?.currency] || settings?.currencySymbol || "Fbu",
      billReference: data.reference || "BL-" + data.id.slice(0, 8).toUpperCase(),
    })
  }

  const statusCounts = useMemo(() => {
    return {
      all: salesTransactions.length,
      paid: salesTransactions.filter((t: any) => t.status === "completed").length,
      pending: salesTransactions.filter((t: any) => t.status !== "completed" && t.status !== "cancelled").length,
      cancelled: salesTransactions.filter((t: any) => t.status === "cancelled").length,
    }
  }, [salesTransactions])

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-report, #printable-report * { visibility: visible; }
          #printable-report { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Historique des ventes</h2>
          <p className="text-muted-foreground">Consultez et gérez toutes les ventes effectuées</p>
        </div>
        <Button variant="outline" onClick={() => setShowReport(true)} disabled={filteredTransactions.length === 0}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimer le rapport
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Terminées</p>
                <p className="text-xl font-bold">{loading ? "—" : stats.totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Revenus</p>
                <p className="text-xl font-bold text-green-600">{loading ? "—" : formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Banknote className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Espèces</p>
                <p className="text-xl font-bold">{loading ? "—" : stats.cashSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Crédit</p>
                <p className="text-xl font-bold">{loading ? "—" : stats.creditSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stats.pendingCount > 0 ? "bg-red-500/10" : "bg-muted"}`}>
                <Receipt className={`h-5 w-5 ${stats.pendingCount > 0 ? "text-red-500" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">En attente</p>
                <p className={`text-xl font-bold ${stats.pendingCount > 0 ? "text-red-500" : ""}`}>
                  {loading ? "—" : stats.pendingCount}
                </p>
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
              <Input
                placeholder="Rechercher par ID, client ou caissier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Select value={waiterFilter} onValueChange={setWaiterFilter}>
                <SelectTrigger className="w-36 h-10">
                  <SelectValue placeholder="Serveur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les serveurs</SelectItem>
                  {waiters.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-32 h-10">
<SelectValue placeholder="Table" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Toutes les tables</SelectItem>
                   {tables.map((num) => (
                     <SelectItem key={num} value={num}>Table {num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="space-y-0">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all" className="relative">
              Tous
              <Badge variant="secondary" className="ml-2 text-xs px-1.5">{statusCounts.all}</Badge>
            </TabsTrigger>
            <TabsTrigger value="paid">
              Payé
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 bg-green-500/10 text-green-700">{statusCounts.paid}</Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              En attente
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 bg-amber-500/10 text-amber-700">{statusCounts.pending}</Badge>
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Annulé
              <Badge variant="secondary" className="ml-2 text-xs px-1.5 bg-red-500/10 text-red-700">{statusCounts.cancelled}</Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={statusFilter} className="mt-4">
          {/* Table */}
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 border-border">
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date et heure</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Table</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Articles</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paiement</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Total</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Statut</TableHead>
                      <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Chargement des transactions...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-48 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <Receipt className="h-12 w-12 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-medium text-muted-foreground">Aucune transaction trouvée</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Essayez de modifier votre recherche ou vos filtres</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTransactions.map((txn: any) => (
                        <TableRow key={txn.id} className="border-border hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">{txn.reference || `#${txn.id.slice(0, 8)}`}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm whitespace-nowrap">{new Date(txn.date).toLocaleDateString()}</span>
                              <span className="text-xs text-muted-foreground">{new Date(txn.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {txn.client ? (
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                                  <User className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <span className="text-sm font-medium">{txn.client.name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground italic">Client libre</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {txn.table ? (
                              <Badge variant="outline" className="text-xs font-mono">
                                T{txn.table.number}
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-normal">
                              {txn.items?.length || 0} {txn.items?.length === 1 ? "article" : "articles"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {txn.paymentMethod ? (
                              <div className="flex items-center gap-1.5">
                                {txn.paymentMethod === "cash" ? (
                                  <Banknote className="h-3.5 w-3.5 text-green-600" />
                                ) : (
                                  <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                                )}
                                <span className="text-sm capitalize">{txn.paymentMethod}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-sm font-semibold">{formatCurrency(Number.parseFloat(txn.total))}</span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                txn.status === "completed"
                                  ? "border-green-500/30 bg-green-500/10 text-green-700 text-xs"
                                  : txn.status === "cancelled"
                                    ? "border-red-500/30 bg-red-500/10 text-red-700 text-xs"
                                    : "border-amber-500/30 bg-amber-500/10 text-amber-700 text-xs"
                              }
                            >
{txn.status === "completed" ? "Payé" : txn.status}
                             </Badge>
                           </TableCell>
                             <TableCell className="text-right">
                               <div className="flex items-center justify-end gap-1">
                                {txn.status !== "completed" && txn.status !== "cancelled" && (
                                   <>
                                    <Button size="sm" className="h-8" onClick={() => setPaymentDialog({ open: true, order: txn })}>
                                      <CreditCard className="h-3.5 w-3.5 mr-1" /> Payer
                                    </Button>
                                    <Button size="sm" variant="secondary" className="h-8" onClick={() => { setCreditClientId(""); setClientSearch(""); setCreditDialog({ open: true, transaction: txn }) }}>
                                      <CreditCard className="h-3.5 w-3.5 mr-1" /> Crédit
                                     </Button>
                                   </>
                                 )}
                                 {txn.status !== "completed" && txn.status !== "cancelled" && (user?.role === "manager" || user?.role === "admin") && (
                                   <>
                                     <Button variant="outline" size="sm" className="h-8" onClick={() => handleEditOpen(txn)}>
                                       <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                                     </Button>
                                      <Button variant="outline" size="sm" className="h-8 text-red-600 border-red-200 hover:bg-red-50" onClick={() => { setCancelDialog({ open: true, transaction: txn }); setCancelReason("") }}>
                                        <X className="h-3.5 w-3.5 mr-1" /> Annuler
                                      </Button>
                                   </>
                                 )}
                                 {txn.status === "completed" && txn.paymentMethod === "credit" && (
                                   <Button variant="outline" size="sm" className="h-8" onClick={() => handleProofOpen(txn)}>
                                     <ImageIcon className="h-3.5 w-3.5 mr-1" /> {txn.clientProof ? "Preuve" : "Attacher"}
                                   </Button>
                                 )}
                                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewDetails(txn)}>
                                   <Eye className="h-4 w-4" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrintThermal(txn)} title="Réimpression ticket">
                                   <Printer className="h-4 w-4" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handlePrintA4Invoice(txn)} title="Facture A4">
                                  <Receipt className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredTransactions.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Lignes par page :</span>
                    <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1) }}>
                      <SelectTrigger className="h-8 w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="ml-auto">
                      {Math.min((page - 1) * pageSize + 1, filteredTransactions.length)}–{Math.min(page * pageSize, filteredTransactions.length)} sur {filteredTransactions.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      <ChevronDown className="h-4 w-4 rotate-90" />
                    </Button>
                    <span className="text-sm font-medium mx-2 min-w-[4rem] text-center">{page} / {totalPages}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      <ChevronDown className="h-4 w-4 -rotate-90" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Détails de la transaction
            </DialogTitle>
            <DialogDescription>Détails complets de cette transaction</DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Référence</p>
                  <p className="font-mono text-xs mt-0.5">{selectedTransaction.reference || selectedTransaction.id}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Date</p>
                  <p className="mt-0.5">{new Date(selectedTransaction.date).toLocaleString()}</p>
                </div>
                <div>
<p className="text-xs text-muted-foreground font-medium">Client</p>
                   <p className="mt-0.5">{selectedTransaction.client?.name || <span className="italic text-muted-foreground">Client libre</span>}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Caissier</p>
                  <p className="mt-0.5">{selectedTransaction.user?.name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Table</p>
                  <p className="mt-0.5">{selectedTransaction.table ? `T${selectedTransaction.table.number}` : "—"}</p>
                </div>
                <div>
<p className="text-xs text-muted-foreground font-medium">Paiement</p>
                   <div className="flex items-center gap-1.5 mt-0.5">
                      {selectedTransaction.status !== "completed" ? (
                        <span className="text-amber-600 font-medium">EN ATTENTE</span>
                      ) : selectedTransaction.paymentMethod === "cash" ? (
                        <>
                          <Banknote className="h-3.5 w-3.5 text-green-600" />
                          <span className="capitalize">Espèces</span>
                        </>
                      ) : selectedTransaction.paymentMethod === "credit" ? (
                        <>
                          <CreditCard className="h-3.5 w-3.5 text-blue-600" />
                          <span className="capitalize">Crédit</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Non payé</span>
                      )}
                   </div>
                </div>
                <div>
<p className="text-xs text-muted-foreground font-medium">Statut</p>
                   <Badge
                     variant="outline"
                     className={
                       selectedTransaction.status === "completed"
                         ? "border-green-500/30 bg-green-500/10 text-green-700 mt-0.5"
                         : selectedTransaction.status === "cancelled"
                           ? "border-red-500/30 bg-red-500/10 text-red-700 mt-0.5"
                           : "border-amber-500/30 bg-amber-500/10 text-amber-700 mt-0.5"
                     }
                   >
                      {selectedTransaction.status === "completed" ? "Payé" : selectedTransaction.status}
                    </Badge>
                    {selectedTransaction.status === "cancelled" && selectedTransaction.cancelReason && (
                      <p className="text-xs text-red-600 mt-2 italic">
                        Motif : {selectedTransaction.cancelReason}
                      </p>
                    )}
                 </div>
               </div>

               <Separator />

               <div>
<h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                   <Package className="h-4 w-4 text-muted-foreground" />
                   Articles
                 </h4>
                <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
                  {selectedTransaction.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground shrink-0">{item.quantity}x</span>
                      <span className="flex-1 px-2">{item.productName}</span>
                      <span className="text-xs text-muted-foreground shrink-0 mr-2">
                        @{formatCurrency(Number.parseFloat(item.price))}
                      </span>
                      <span className="font-medium shrink-0">{formatCurrency(Number.parseFloat(item.price) * item.quantity)}</span>
                    </div>
                  ))}
                  {(!selectedTransaction.items || selectedTransaction.items.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-2">Aucun article</p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(Number.parseFloat(selectedTransaction.total))}
                </span>
              </div>

              {selectedTransaction.status !== "completed" && selectedTransaction.status !== "cancelled" && (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    setShowDetails(false)
                    setPaymentDialog({ open: true, order: selectedTransaction })
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" /> Traiter le paiement
                </Button>
              )}

              {selectedTransaction.paymentMethod === "credit" && selectedTransaction.status === "completed" && (
                <div className="flex justify-center">
                  <Button variant="outline" className="w-full" onClick={() => handleProofOpen(selectedTransaction)}>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    {selectedTransaction.clientProof ? "Voir la preuve" : "Attacher une preuve"}
                  </Button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowDetails(false)}>Fermer</Button>
                <Button variant="outline" onClick={() => handlePrintThermal()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Réimpression ticket
                </Button>
                <Button onClick={() => handlePrintA4Invoice(selectedTransaction)}>
                  <Receipt className="h-4 w-4 mr-2" />
                  Facture A4
                </Button>
              </div>
             </div>
           )}
         </DialogContent>
       </Dialog>

       {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialog.open}
        onOpenChange={(open) => setPaymentDialog({ open, order: open ? paymentDialog.order : null })}
        order={paymentDialog.order}
        onPay={handlePayment}
      />

      {/* Report Preview Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="sm:max-w-[95vw] md:max-w-[90vw] lg:max-w-[85vw] h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rapport des ventes</DialogTitle>
            <DialogDescription>Consultez et imprimez le rapport des ventes</DialogDescription>
          </DialogHeader>

          <div id="printable-report" className="space-y-6 p-6">
            {/* Header */}
            <div className="text-center border-b border-double border-gray-400 pb-4 mb-2">
              <h1 className="text-2xl font-black tracking-tight uppercase">{settings?.name || "SmartPOS"}</h1>
              <p className="text-xs text-muted-foreground">{settings?.address || ""}{settings?.address && settings?.phone ? " · " : ""}{settings?.phone || ""}</p>
              <h2 className="text-lg font-bold tracking-tight mt-3">RAPPORT D'ACTIVITÉ DES VENTES</h2>
              <p className="text-sm text-muted-foreground">Généré {new Date().toLocaleString()}</p>
              {(startDate || endDate) && (
                <p className="text-sm font-medium mt-1">
                  Période : {startDate || "—"} au {endDate || "—"}
                </p>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {filteredTransactions.length > 0 && (() => {
                const completed = filteredTransactions.filter((t: any) => t.status === "completed")
                const totalRevenue = completed.reduce((a: number, t: any) => a + Number.parseFloat(t.total), 0)
                const cashTxns = completed.filter((t: any) => t.paymentMethod === "cash")
                const creditTxns = completed.filter((t: any) => t.paymentMethod === "credit")
                const cashTotal = cashTxns.reduce((a: number, t: any) => a + Number.parseFloat(t.total), 0)
                const creditTotal = creditTxns.reduce((a: number, t: any) => a + Number.parseFloat(t.total), 0)
                const totalItems = completed.reduce((a: number, t: any) => a + (t.items?.length || 0), 0)
                const stats = [
                  { label: "Transactions", value: String(filteredTransactions.length), sub: `${completed.length} terminées`, hl: false },
                  { label: "Revenus totaux", value: formatCurrency(totalRevenue), sub: `Moy. ${formatCurrency(completed.length ? totalRevenue / completed.length : 0)}`, hl: true },
                  { label: "Espèces", value: `${cashTxns.length} txns`, sub: formatCurrency(cashTotal), hl: false },
                  { label: "Crédit", value: `${creditTxns.length} txns`, sub: formatCurrency(creditTotal), hl: false },
                  { label: "Articles vendus", value: String(totalItems), sub: `Sur ${completed.length} commandes`, hl: false },
                  { label: "En attente", value: String(filteredTransactions.filter((t: any) => t.status !== "completed" && t.status !== "cancelled").length), sub: "", hl: false },
                  { label: "Annulés", value: String(filteredTransactions.filter((t: any) => t.status === "cancelled").length), sub: "", hl: false },
                  { label: "Serveurs actifs", value: String(new Set(completed.filter((t: any) => t.user?.name).map((t: any) => t.user.name)).size), sub: `${new Set(completed.filter((t: any) => t.table?.number).map((t: any) => t.table.number)).size} tables`, hl: false },
                ]
                return (
                  <>
                    {stats.map((s) => (
                      <div key={s.label} className="rounded-lg bg-muted/30 p-3 text-center print:bg-gray-100">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</p>
                        <p className={`text-lg font-bold mt-1 ${s.hl ? "text-primary" : ""}`}>{s.value}</p>
                        {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
                      </div>
                    ))}
                  </>
                )
              })()}
            </div>

            {/* Payment Summary Table */}
            {(() => {
              const completed = filteredTransactions.filter((t: any) => t.status === "completed")
              const methods = ["cash", "credit", "credit_card", "mobile_money", "other"]
              const methodLabels: Record<string, string> = { cash: "Espèces", credit: "Crédit", credit_card: "Carte de crédit", mobile_money: "Mobile Money", other: "Autre" }
              return (
                <div className="border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Répartition des modes de paiement</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-1.5 font-medium text-muted-foreground">Méthode</th>
                        <th className="py-1.5 font-medium text-muted-foreground text-right">Nombre</th>
                        <th className="py-1.5 font-medium text-muted-foreground text-right">Total</th>
                        <th className="py-1.5 font-medium text-muted-foreground text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {methods.filter((m) => completed.some((t: any) => t.paymentMethod === m)).map((method) => {
                        const txns = completed.filter((t: any) => t.paymentMethod === method)
                        const total = txns.reduce((a: number, t: any) => a + Number.parseFloat(t.total), 0)
                        const grandTotal = completed.reduce((a: number, t: any) => a + Number.parseFloat(t.total), 0)
                        return (
                          <tr key={method} className="border-b border-border/50">
                            <td className="py-1.5 capitalize">{methodLabels[method] || method}</td>
                            <td className="py-1.5 text-right">{txns.length}</td>
                            <td className="py-1.5 text-right font-medium">{formatCurrency(total)}</td>
                            <td className="py-1.5 text-right text-muted-foreground">{grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) + "%" : "—"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })()}

            {/* Transactions Table */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Liste des transactions
                <span className="font-normal text-xs ml-2">({filteredTransactions.length} total)</span>
              </h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 print:bg-gray-200 border-b border-border">
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider">Réf</th>
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider">Client</th>
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider">Caissier</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider">Table</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider">Articles</th>
                    <th className="text-left py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider">Paiement</th>
                    <th className="text-right py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                    <th className="text-center py-2 px-2 font-semibold text-muted-foreground uppercase tracking-wider">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn: any) => (
                    <tr key={txn.id} className="border-b border-border/50">
                      <td className="py-1.5 px-2 font-mono font-medium">{txn.reference || `#${txn.id.slice(0, 8)}`}</td>
                      <td className="py-1.5 px-2 whitespace-nowrap">{new Date(txn.date).toLocaleDateString()} {new Date(txn.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                      <td className="py-1.5 px-2">{txn.client?.name || "Client libre"}</td>
                      <td className="py-1.5 px-2">{txn.user?.name || "—"}</td>
                      <td className="py-1.5 px-2 text-center">{txn.table ? `T${txn.table.number}` : "—"}</td>
                      <td className="py-1.5 px-2 text-center">{txn.items?.length || 0}</td>
                      <td className="py-1.5 px-2 capitalize">{txn.paymentMethod || "Non payé"}</td>
                      <td className="py-1.5 px-2 text-right font-medium">{formatCurrency(Number.parseFloat(txn.total))}</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={
                          txn.status === "completed" ? "text-green-700 font-semibold" :
                          txn.status === "cancelled" ? "text-red-600 font-semibold" :
                          "text-amber-600 font-semibold"
                        }>
{txn.status === "completed" ? "Payé" : txn.status}
                         </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-muted-foreground border-t border-double border-gray-400 pt-3 mt-4">
              <p>{settings?.name || "SmartPOS"} — Fin du rapport — Page 1</p>
              <p className="mt-0.5">Généré automatiquement. Ce rapport est un résumé des transactions de vente.</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowReport(false)}>Fermer</Button>
            <Button onClick={() => {
              const w = window.open("", "_blank")
              if (!w) return
              const reportEl = document.getElementById("printable-report")
              if (!reportEl) return
              const styles = Array.from(document.styleSheets).map((s) => {
                try {
                  return Array.from(s.cssRules || []).map((r) => r.cssText).join("\n")
                } catch { return "" }
              }).join("\n")
              w.document.write(`<!DOCTYPE html><html><head><title>Rapport des ventes</title><style>body{margin:0;padding:20px;font-family:system-ui,-apple-system,sans-serif;color:#1a1a2e}table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;padding:6px 8px;border-bottom:2px solid #d1d5db;font-size:10px;text-transform:uppercase;color:#6b7280;font-weight:600}td{padding:5px 8px;border-bottom:1px solid #e5e7eb}tr:last-child td{border-bottom:none}.text-right{text-align:right}.text-center{text-align:center}.font-mono{font-family:'Courier New',monospace}.font-bold{font-weight:700}.font-semibold{font-weight:600}.uppercase{text-transform:uppercase}.tracking-wider{letter-spacing:0.05em}.text-muted{color:#6b7280}.text-xs{font-size:11px}.text-sm{font-size:12px}.text-lg{font-size:16px}.text-2xl{font-size:22px}.mt-1{margin-top:4px}.mt-2{margin-top:8px}.mt-3{margin-top:12px}.mt-4{margin-top:16px}.mb-2{margin-bottom:8px}.mb-3{margin-bottom:12px}.p-3{padding:12px}.p-4{padding:16px}.p-6{padding:24px}.rounded-lg{border-radius:8px}.border{border:1px solid #e5e7eb}.border-b{border-bottom:1px solid #e5e7eb}.border-t{border-top:1px solid #e5e7eb}.border-double{border-style:double}.border-gray-400{border-color:#9ca3af}.gap-3{gap:12px}.gap-4{gap:16px}.grid{display:grid}.grid-cols-2{grid-template-columns:1fr 1fr}.bg-muted{background-color:#f3f4f6}.bg-gray-100{background-color:#f3f4f6}.text-primary{color:#2563eb}.text-green-700{color:#15803d}.text-red-600{color:#dc2626}.text-amber-600{color:#d97706}.capitalize{text-transform:capitalize}.whitespace-nowrap{white-space:nowrap}.space-y-6>*+*{margin-top:24px}.space-y-4>*+*{margin-top:16px}.space-y-3>*+*{margin-top:12px}@media print{body{padding:0}table{page-break-inside:avoid}tr{page-break-inside:avoid}}</style></head><body>${reportEl.innerHTML}</body></html>`)
              w.document.close()
              w.focus()
              setTimeout(() => { w.print(); w.close() }, 300)
            }}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => { if (!open) setEditDialog({ open: false, transaction: null }) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Modifier la facture
            </DialogTitle>
            <DialogDescription>Modifiez les articles de cette facture non payée</DialogDescription>
          </DialogHeader>

          {editDialog.transaction && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {editItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-center">
                        <label className="text-xs text-muted-foreground">Qté</label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleEditItemChange(idx, "quantity", e.target.value)}
                          className="h-8 w-16 text-center"
                          min="0"
                          step="any"
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <label className="text-xs text-muted-foreground">Prix</label>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) => handleEditItemChange(idx, "price", e.target.value)}
                          className="h-8 w-20 text-center"
                          min="0"
                          step="any"
                        />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 shrink-0" onClick={() => handleEditItemRemove(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total</span>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(editItems.reduce((sum: number, item: any) => sum + Number(item.price) * Number(item.quantity), 0))}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditDialog({ open: false, transaction: null })}>Annuler</Button>
                <Button onClick={handleEditSave}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Proof Upload Dialog */}
      <Dialog open={proofDialog.open} onOpenChange={(open) => { if (!open) setProofDialog({ open: false, transaction: null }) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Preuve de facture signée
            </DialogTitle>
            <DialogDescription>
              Attachez une photo ou un scan de la facture signée par le client
            </DialogDescription>
          </DialogHeader>

          {proofDialog.transaction && (
            <div className="space-y-4">
              {proofFile ? (
                <div className="relative rounded-lg border border-border overflow-hidden">
                  <img src={proofFile} alt="Preuve" className="w-full h-auto max-h-80 object-contain" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute top-2 right-2 bg-background/80"
                    onClick={handleProofRemove}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 rounded-lg border-2 border-dashed border-border cursor-pointer hover:bg-muted/30 transition-colors">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Cliquez pour sélectionner une image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleProofFileChange} />
                </label>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setProofDialog({ open: false, transaction: null }); setProofFile(null) }}>
                  Annuler
                </Button>
                <Button onClick={handleProofSave} disabled={!proofFile && !proofDialog.transaction?.clientProof}>
                  <Upload className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Convert to Credit Dialog */}
      <Dialog open={creditDialog.open} onOpenChange={(open) => { if (!open) { setCreditDialog({ open: false, transaction: null }); setCreditClientId(""); setClientSearch("") } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Convertir en facture crédit
            </DialogTitle>
            <DialogDescription>
              Le client est parti sans payer ? Sélectionnez un client pour convertir cette facture en crédit.
            </DialogDescription>
          </DialogHeader>

          {creditDialog.transaction && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Référence :</span> <span className="font-mono font-medium">{creditDialog.transaction.reference || creditDialog.transaction.id.slice(0, 8)}</span></p>
                <p><span className="text-muted-foreground">Total :</span> <span className="font-semibold">{formatCurrency(Number.parseFloat(creditDialog.transaction.total))}</span></p>
                <p><span className="text-muted-foreground">Date :</span> {new Date(creditDialog.transaction.date).toLocaleDateString()}</p>
              </div>

              <div className="space-y-2">
                <Label>Client</Label>
                <Input
                  placeholder="Rechercher un client..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="h-10"
                />
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                  {filteredClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucun client trouvé</p>
                  ) : (
                    filteredClients.map((c: any) => (
                      <div
                        key={c.id}
                        className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm hover:bg-muted/50 transition-colors ${creditClientId === c.id ? "bg-primary/10 font-medium" : ""}`}
                        onClick={() => setCreditClientId(c.id)}
                      >
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.phone} {c.email ? `· ${c.email}` : ""}</p>
                        </div>
                        {c.creditBalance > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">{formatCurrency(Number.parseFloat(c.creditBalance))}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setCreditDialog({ open: false, transaction: null }); setCreditClientId(""); setClientSearch("") }}>
                  Annuler
                </Button>
                <Button onClick={handleCreditConvert} disabled={!creditClientId || converting}>
                  {converting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Conversion...</>
                  ) : (
                    <><CreditCard className="h-4 w-4 mr-2" /> Confirmer le crédit</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => { if (!open) setCancelDialog({ open: false, transaction: null }) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmer l'annulation
            </DialogTitle>
            <DialogDescription>
              Les stocks seront restitués et la facture sera marquée comme annulée dans l'historique.
            </DialogDescription>
          </DialogHeader>

          {cancelDialog.transaction && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">Référence :</span> <span className="font-mono font-medium">{cancelDialog.transaction.reference || cancelDialog.transaction.id.slice(0, 8)}</span></p>
                <p><span className="text-muted-foreground">Date :</span> {new Date(cancelDialog.transaction.date).toLocaleDateString()}</p>
                <p><span className="text-muted-foreground">Total :</span> <span className="font-semibold">{formatCurrency(Number.parseFloat(cancelDialog.transaction.total))}</span></p>
                <p><span className="text-muted-foreground">Articles :</span> {cancelDialog.transaction.items?.length || 0}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Motif de l'annulation</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="Expliquez la raison de l'annulation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCancelDialog({ open: false, transaction: null })}>Retour</Button>
                <Button variant="destructive" onClick={handleCancelConfirm} disabled={cancelling}>
                  {cancelling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Annulation...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Annuler la facture
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
