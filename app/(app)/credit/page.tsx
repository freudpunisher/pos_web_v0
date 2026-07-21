"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/mock-data"
import type { CreditRecord } from "@/lib/types"
import { Search, CreditCard, DollarSign, AlertTriangle, CheckCircle, Clock, Banknote, History } from "lucide-react"
import { useCredits } from "@/hooks/use-credits"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

export default function CreditManagementPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [selectedRecord, setSelectedRecord] = useState<CreditRecord | null>(null)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash")

  const { user } = useAuth()
  const sector = user?.role === "cashier_bakery" ? "Boulangerie" : undefined
  const { records, loading, recordPayment } = useCredits(undefined, sector)

  const filteredRecords = useMemo(() => {
    return records.filter((record: any) => {
      const isOverdue = new Date(record.dueDate) < new Date() && record.status !== "paid"
      const effectiveStatus = isOverdue ? "overdue" : record.status
      if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const ref = (record.reference || "").toLowerCase()
        const name = (record.clientName || "").toLowerCase()
        if (!ref.includes(q) && !name.includes(q)) return false
      }
      return true
    })
  }, [records, statusFilter, search])

  const totalOutstanding = records.reduce((sum: number, r: any) => sum + (Number(r.amount) - Number(r.paidAmount)), 0)
  const overdueCount = records.filter((r: any) => new Date(r.dueDate) < new Date() && r.status !== "paid").length
  const paidCount = records.filter((r: any) => r.status === "paid").length
  const pendingCount = records.filter((r: any) => r.status === "pending" || r.status === "partial").length

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none">Payé</Badge>
      case "partial":
        return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-none">Partiel</Badge>
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-none">En attente</Badge>
      case "overdue":
        return <Badge className="bg-rose-500/20 text-rose-600 dark:text-rose-400 border-none">En retard</Badge>
      default:
        return null
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedRecord) return
    const amount = Number(paymentAmount || 0)
    if (!amount || amount <= 0) return
    try {
      await recordPayment(selectedRecord.id, amount, paymentMethod)
      toast.success("Payment recorded")
      setShowPaymentDialog(false)
      setPaymentAmount("")
      setPaymentMethod("cash")
      setSelectedRecord(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment")
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          {sector ? "Payement credit Boulangerie" : "Payement credit"}
        </h2>
        <p className="text-muted-foreground">
          {sector ? "Suivi des payement credit de la boulangerie" : "Suivez et gérez les ventes à crédit et les paiements"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total impayé</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalOutstanding)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En attente / Partiel</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En retard</p>
                <p className="text-2xl font-bold text-destructive">{overdueCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payé</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{paidCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par client ou référence..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">Statut :</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="partial">Partiel</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Credit Records Table */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Enregistrements de crédit
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="text-muted-foreground">Référence</TableHead>
                  <TableHead className="text-muted-foreground">Client</TableHead>
                  <TableHead className="text-muted-foreground text-right">Montant</TableHead>
                  <TableHead className="text-muted-foreground text-right">Payé</TableHead>
                  <TableHead className="text-muted-foreground text-right">Restant</TableHead>
                  <TableHead className="text-muted-foreground">Date d'échéance</TableHead>
                  <TableHead className="text-muted-foreground">Statut</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Chargement des enregistrements de crédit...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Aucun enregistrement de crédit trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => {
                    const amountValue = Number(record.amount || 0)
                    const paidValue = Number(record.paidAmount || 0)
                    const remaining = amountValue - paidValue
                    const progress = amountValue > 0 ? (paidValue / amountValue) * 100 : 0
                    const isOverdue = new Date(record.dueDate) < new Date() && record.status !== "paid"
                    const effectiveStatus = isOverdue ? "overdue" : record.status

                    return (
                      <TableRow key={record.id} className="border-border">
                        <TableCell className="font-mono text-sm font-medium">
                          {record.reference || record.transactionId.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell className="font-medium">{record.clientName || "Inconnu"}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(amountValue)}</TableCell>
                        <TableCell className="text-right min-w-[140px]">
                          <div>
                            <span className="font-semibold text-foreground">{formatCurrency(paidValue)}</span>
                            <Progress value={progress} className="mt-1 h-1.5 w-16" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={remaining > 0 ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"}>
                            {formatCurrency(remaining)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={isOverdue ? "text-rose-600 dark:text-rose-400" : ""}>
                            {new Date(record.dueDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(effectiveStatus)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {effectiveStatus !== "paid" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRecord(record as any)
                                  setShowPaymentDialog(true)
                                }}
                              >
                                <Banknote className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRecord(record as any)
                                setShowHistoryDialog(true)
                              }}
                            >
                              <History className="h-4 w-4" />
                            </Button>
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

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer le paiement</DialogTitle>
            <DialogDescription>Enregistrer un paiement pour l'enregistrement de crédit {selectedRecord?.id}</DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{(selectedRecord as any).clientName || "Inconnu"}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Montant total</span>
                  <span className="font-medium">{formatCurrency(Number(selectedRecord.amount))}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">Déjà payé</span>
                  <span className="font-medium text-accent">{formatCurrency(Number(selectedRecord.paidAmount))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Restant</span>
                  <span className="font-bold text-warning">
                    {formatCurrency(Number(selectedRecord.amount) - Number(selectedRecord.paidAmount))}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Montant du paiement</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Moyen de paiement</Label>
                <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as "cash" | "card")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un moyen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Espèces</SelectItem>
                    <SelectItem value="card">Carte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleRecordPayment} disabled={!paymentAmount || Number(paymentAmount) <= 0}>
              Enregistrer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historique des paiements</DialogTitle>
            <DialogDescription>Historique des paiements pour {selectedRecord?.id}</DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-border bg-secondary/30 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Montant total :</span>
                  <span className="font-medium">{formatCurrency(Number(selectedRecord.amount))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Payé :</span>
                  <span className="font-medium text-accent">{formatCurrency(Number(selectedRecord.paidAmount))}</span>
                </div>
              </div>

              {selectedRecord.payments.length > 0 ? (
                <div className="space-y-2">
                  {selectedRecord.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
                    >
                      <div>
                        <p className="font-mono text-sm">{payment.paymentRef || payment.id}</p>
                        <p className="text-xs text-muted-foreground">{new Date(payment.date).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-accent">{formatCurrency(Number(payment.amount))}</p>
                        <Badge variant="outline" className="text-xs">
                          {payment.method}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Aucun paiement enregistré</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
