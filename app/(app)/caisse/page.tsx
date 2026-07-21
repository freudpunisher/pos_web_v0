"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useCaisse } from "@/hooks/use-caisse"
import { useAuth } from "@/lib/auth-context"
import { formatCurrency } from "@/lib/mock-data"
import { toast } from "sonner"
import { printReport } from "@/lib/print-report"
import {
    Loader2,
    Play,
    Square,
    Plus,
    Minus,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Banknote,
    Wallet,
    History,
    AlertTriangle,
    CheckCircle2,
    Calculator,
    Printer,
} from "lucide-react"
import Swal from "sweetalert2"

export default function CaisseManagementPage() {
    const { sessions, openSession, loading, refresh, openSessionAction, closeSession, addMovement, getSessionDetails } = useCaisse()
    const { user } = useAuth()

    const [showOpenDialog, setShowOpenDialog] = useState(false)
    const [showCloseDialog, setShowCloseDialog] = useState(false)
    const [showMovementDialog, setShowMovementDialog] = useState(false)
    const [showDetailsDialog, setShowDetailsDialog] = useState(false)
    const [selectedSession, setSelectedSession] = useState<any>(null)
    const [sessionDetails, setSessionDetails] = useState<any>(null)
    const [detailsLoading, setDetailsLoading] = useState(false)
    const [activeSessionDetails, setActiveSessionDetails] = useState<any>(null)

    // Fetch details for active session automatically with polling
    useEffect(() => {
        let interval: any
        const fetchDetails = () => {
            if (openSession) {
                getSessionDetails(openSession.id)
                    .then(data => setActiveSessionDetails(data))
                    .catch(err => console.error("Error fetching active session details:", err))
            }
        }

        fetchDetails()
        if (openSession) {
            interval = setInterval(fetchDetails, 5000) // Poll every 5 seconds
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [openSession, getSessionDetails])

    // Open form
    const [openBalance, setOpenBalance] = useState("0")
    const [openNotes, setOpenNotes] = useState("")

    // Close form
    const [closeBalance, setCloseBalance] = useState("0")
    const [closeNotes, setCloseNotes] = useState("")

    // Movement form
    const [movementType, setMovementType] = useState<"in" | "out">("in")
    const [movementAmount, setMovementAmount] = useState("")
    const [movementReason, setMovementReason] = useState("")

    const isAdmin = user?.role === "admin" || user?.role === "manager"

    // Only the user who opened the session (or admin/manager) can close it
    const canCloseSession = !!(user && openSession && (user.id === openSession.userId || isAdmin))

    const handleOpenSession = async () => {
        if (!user) return
        try {
            await openSessionAction({
                userId: user.id,
                openingBalance: parseFloat(openBalance) || 0,
                notes: openNotes || undefined,
            })
            toast.success("Session ouverte avec succès")
            setShowOpenDialog(false)
            setOpenBalance("0")
            setOpenNotes("")
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de l'ouverture")
        }
    }

    const handleCloseSession = async () => {
        if (!openSession) return
        try {
            const result = await closeSession(openSession.id, {
                closingBalance: parseFloat(closeBalance) || 0,
                notes: closeNotes || undefined,
            })
            setShowCloseDialog(false)
            setCloseBalance("0")
            setCloseNotes("")

            const diff = parseFloat(result.difference || "0")
            if (diff === 0) {
                toast.success("Caisse clôturée — écart nul")
            } else {
                const msg = diff > 0
                    ? `Caisse clôturée avec un excédent de ${formatCurrency(diff)}`
                    : `Caisse clôturée avec un déficit de ${formatCurrency(Math.abs(diff))}`
                toast(msg, {
                    icon: diff > 0 ? "🟢" : "🔴",
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de la fermeture")
        }
    }

    const handleAddMovement = async () => {
        if (!openSession || !movementAmount || !movementReason) {
            toast.error("Veuillez remplir tous les champs")
            return
        }
        try {
            await addMovement(openSession.id, {
                type: movementType,
                amount: parseFloat(movementAmount) || 0,
                reason: movementReason,
            })
            toast.success("Mouvement enregistré")
            setShowMovementDialog(false)
            setMovementAmount("")
            setMovementReason("")
        } catch (err: any) {
            toast.error(err.message || "Erreur lors de l'enregistrement")
        }
    }

    const handlePrintSession = (session: any, details?: any) => {
        const origin = window.location.origin
        const d = details || session
        const opening = Number(d.openingBalance || 0)
        const expected = Number(d.computedExpectedBalance || 0)
        const physical = d.closingBalance !== null ? Number(d.closingBalance) : null
        const diff = d.difference !== null ? Number(d.difference || 0) : null
        const movements = d.movements || []

        printReport({
            title: "Rapport de Caisse",
            subtitle: "Smart POS System",
            period: `Session du ${new Date(d.openedAt).toLocaleString()}` + (d.closedAt ? ` au ${new Date(d.closedAt).toLocaleString()}` : ""),
            logoUrl: `${origin}/ahava.png`,
            metrics: [
                { label: "Caissier", value: d.user?.name || "—" },
                { label: "Statut", value: d.status === "open" ? "Ouverte" : "Fermée" },
                { label: "Solde d'ouverture", value: formatCurrency(opening) },
                { label: "Solde attendu", value: formatCurrency(expected), highlight: true },
                ...(physical !== null ? [{ label: "Solde physique", value: formatCurrency(physical) }] : []),
                ...(diff !== null ? [{ label: "Écart", value: (diff > 0 ? "+" : "") + formatCurrency(Math.abs(diff)), highlight: diff !== 0 }] : []),
                ...(d.computedUnpaidDebts > 0 ? [{ label: "Dettes impayées", value: formatCurrency(d.computedUnpaidDebts), highlight: true }] : []),
            ],
            columns: [
                { header: "Libellé", key: "label" },
                { header: "Montant", key: "amount", format: "currency", align: "right" },
            ],
            rows: [
                { label: "Solde d'ouverture", amount: opening },
                { label: "Ventes espèces", amount: d.computedCashSales || 0 },
                ...(d.computedCreditCashPayments ? [{ label: "Paiements factures (espèces)", amount: d.computedCreditCashPayments || 0 }] : []),
                ...(d.computedCardSales ? [{ label: "Ventes carte", amount: d.computedCardSales || 0 }] : []),
                ...(d.computedCreditCardPayments ? [{ label: "Paiements factures (carte)", amount: d.computedCreditCardPayments || 0 }] : []),
                ...movements.map((m: any) => ({
                    label: `${m.type === "in" ? "Entrée" : "Sortie"} manuelle : ${m.reason}`,
                    amount: m.type === "in" ? Number(m.amount) : -Number(m.amount),
                })),
                { label: "Dépenses", amount: -(d.computedExpenses || 0) },
                { label: "Solde attendu", amount: expected },
                ...(physical !== null ? [{ label: "Solde physique", amount: physical }] : []),
                ...(diff !== null ? [{ label: "Écart", amount: diff }] : []),
            ],
        })
    }

    const handleViewDetails = async (session: any) => {
        setSelectedSession(session)
        setShowDetailsDialog(true)
        setDetailsLoading(true)
        try {
            const details = await getSessionDetails(session.id)
            setSessionDetails(details)
        } catch {
            toast.error("Impossible de charger les détails")
        } finally {
            setDetailsLoading(false)
        }
    }

    // Sort sessions: open first, then by date desc
    const sortedSessions = useMemo(() => {
        return [...sessions].sort((a, b) => {
            if (a.status === "open" && b.status !== "open") return -1
            if (a.status !== "open" && b.status === "open") return 1
            return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
        })
    }, [sessions])

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestion de Caisse</h2>
                    <p className="text-muted-foreground">Ouverture, clôture et suivi des caisses</p>
                </div>
                <div className="flex gap-2">
                    {!openSession ? (
                        <Button onClick={() => setShowOpenDialog(true)} disabled={!user}>
                            <Play className="mr-2 h-4 w-4" />
                            Ouvrir la Caisse
                        </Button>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => setShowMovementDialog(true)}>
                                {movementType === "in" ? <Plus className="mr-2 h-4 w-4" /> : <Minus className="mr-2 h-4 w-4" />}
                                Mouvement
                            </Button>
                            <Button variant="default" onClick={() => {
                                handleViewDetails(openSession).then(() => setShowCloseDialog(true))
                            }} disabled={!canCloseSession} title={!canCloseSession ? "Seul l'utilisateur qui a ouvert la caisse peut la fermer" : ""}>
                                <Square className="mr-2 h-4 w-4" />
                                Clôturer
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Open Session Card */}
            {openSession && (
                <Card className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                                </span>
                                Session active
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                    Ouverte le {new Date(openSession.openedAt).toLocaleString()}
                                </Badge>
                                <Button variant="outline" size="sm" onClick={() => handlePrintSession(openSession, sessionDetails)}>
                                    <Printer className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                            <div className="rounded-lg bg-card p-2 border">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Ouverture</p>
                                <p className="text-sm font-bold">{formatCurrency(Number(openSession.openingBalance))}</p>
                            </div>
                            <div className="rounded-lg bg-card p-2 border">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold text-green-600">Ventes espèces</p>
                                <p className="text-sm font-bold text-green-700">+{formatCurrency(activeSessionDetails?.computedCashSales || 0)}</p>
                            </div>
                            <div className="rounded-lg bg-card p-2 border">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold text-emerald-600">Factures (Esp)</p>
                                <p className="text-sm font-bold text-emerald-700">+{formatCurrency(activeSessionDetails?.computedCreditCashPayments || 0)}</p>
                            </div>
                            <div className="rounded-lg bg-card p-2 border">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold text-blue-600">Ventes carte</p>
                                <p className="text-sm font-bold text-blue-700">{formatCurrency(activeSessionDetails?.computedCardSales || 0)}</p>
                            </div>
                            <div className="rounded-lg bg-card p-2 border">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold text-indigo-600">Factures (Carte)</p>
                                <p className="text-sm font-bold text-indigo-700">{formatCurrency(activeSessionDetails?.computedCreditCardPayments || 0)}</p>
                            </div>
                            <div className="rounded-lg bg-card p-2 border">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold text-red-600">Dépenses</p>
                                <p className="text-sm font-bold text-red-700">-{formatCurrency(activeSessionDetails?.computedExpenses || 0)}</p>
                            </div>
                            <div className="rounded-lg bg-card p-2 border">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Caissier</p>
                                <p className="text-sm font-bold truncate">{openSession.user?.name || user?.name}</p>
                            </div>
                            <div className="rounded-lg bg-card p-2 border">
                                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Attendu (Esp)</p>
                                <p className="text-sm font-bold text-primary">{formatCurrency(activeSessionDetails?.computedExpectedBalance || 0)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Sessions History */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        Historique des Sessions
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : sortedSessions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Wallet className="h-12 w-12 mb-3 opacity-50" />
                            <p>Aucune session de caisse</p>
                            <p className="text-sm">Cliquez sur &quot;Ouvrir la Caisse&quot; pour commencer</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Caissier</TableHead>
                                    <TableHead>Ouverture</TableHead>
                                    <TableHead>Fermeture</TableHead>
                                    <TableHead className="text-right">Solde départ</TableHead>
                                    <TableHead className="text-right">Solde attendu</TableHead>
                                    <TableHead className="text-right">Solde physique</TableHead>
                                    <TableHead className="text-right">Écart</TableHead>
                                    <TableHead>Statut</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedSessions.map((session) => {
                                    const diff = session.difference ? Number(session.difference) : null
                                    const isBalanced = diff === 0
                                    const isSurplus = diff !== null && diff > 0
                                    const isDeficit = diff !== null && diff < 0

                                    return (
                                        <TableRow key={session.id}>
                                            <TableCell className="font-medium">
                                                {session.user?.name || "—"}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {new Date(session.openedAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {session.closedAt
                                                    ? new Date(session.closedAt).toLocaleString()
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(Number(session.openingBalance))}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {session.expectedBalance !== null
                                                    ? formatCurrency(Number(session.expectedBalance))
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {session.closingBalance !== null
                                                    ? formatCurrency(Number(session.closingBalance))
                                                    : "—"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {diff !== null ? (
                                                    <span className={
                                                        isDeficit ? "text-red-600 font-semibold" :
                                                        isSurplus ? "text-amber-600 font-semibold" :
                                                        "text-green-600 font-semibold"
                                                    }>
                                                        {diff > 0 ? "+" : ""}{formatCurrency(Math.abs(diff))}
                                                        {isBalanced && " ✓"}
                                                    </span>
                                                ) : "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={
                                                        session.status === "open"
                                                            ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                                            : "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700"
                                                    }
                                                >
                                                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${session.status === "open" ? "bg-green-500" : "bg-gray-400"}`} />
                                                    {session.status === "open" ? "Ouverte" : "Fermée"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleViewDetails(session)}
                                                >
                                                    Détails
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Open Session Dialog */}
            <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Play className="h-5 w-5 text-green-600" />
                            Ouvrir la Caisse
                        </DialogTitle>
                        <DialogDescription>
                            Saisissez le solde d&apos;ouverture et les informations de la session.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Solde d&apos;ouverture (espèces dans le tiroir)</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={openBalance}
                                onChange={(e) => setOpenBalance(e.target.value)}
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Notes (optionnel)</Label>
                            <Input
                                value={openNotes}
                                onChange={(e) => setOpenNotes(e.target.value)}
                                placeholder="Notes d'ouverture"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowOpenDialog(false)}>Annuler</Button>
                        <Button onClick={handleOpenSession}>
                            Ouvrir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close Session Dialog */}
            <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Square className="h-5 w-5 text-red-600" />
                            Clôturer la Caisse
                        </DialogTitle>
                        <DialogDescription>
                            Comptez les espèces dans le tiroir et saisissez le montant.
                        </DialogDescription>
                    </DialogHeader>

                    {detailsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : sessionDetails ? (
                        <div className="space-y-4">
                            {/* Expected balance breakdown */}
                            <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Solde d&apos;ouverture</span>
                                    <span className="font-medium">{formatCurrency(Number(openSession?.openingBalance || 0))}</span>
                                </div>
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>+ Ventes espèces</span>
                                    <span className="font-medium">{formatCurrency(sessionDetails.computedCashSales || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-emerald-600">
                                    <span>+ Paiements factures (espèces)</span>
                                    <span className="font-medium">{formatCurrency(sessionDetails.computedCreditCashPayments || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-blue-600">
                                    <span>+ Ventes carte</span>
                                    <span className="font-medium">{formatCurrency(sessionDetails.computedCardSales || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-indigo-600">
                                    <span>+ Paiements factures (carte)</span>
                                    <span className="font-medium">{formatCurrency(sessionDetails.computedCreditCardPayments || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-amber-600">
                                    <span>+ Entrées manuelles</span>
                                    <span className="font-medium">{formatCurrency(sessionDetails.computedManualIn || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>- Sorties manuelles</span>
                                    <span className="font-medium">{formatCurrency(sessionDetails.computedManualOut || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-red-600">
                                    <span>- Dépenses</span>
                                    <span className="font-medium">{formatCurrency(sessionDetails.computedExpenses || 0)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-bold text-base">
                                    <span>Solde attendu</span>
                                    <span className="text-primary">{formatCurrency(sessionDetails.computedExpectedBalance || 0)}</span>
                                </div>
                            </div>

                            {/* Unpaid debts */}
                            {sessionDetails.computedUnpaidDebts > 0 && (
                                <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                                    <div className="text-sm">
                                        <span className="font-medium text-orange-700">Dettes impayées : </span>
                                        <span className="font-bold text-orange-700">{formatCurrency(sessionDetails.computedUnpaidDebts)}</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Solde physique (espèces comptées)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={closeBalance}
                                    onChange={(e) => setCloseBalance(e.target.value)}
                                    placeholder="Saisir le montant compté"
                                />
                            </div>

                            {closeBalance && (
                                <div className={`rounded-lg p-3 border flex items-center gap-2 ${
                                    parseFloat(closeBalance) === sessionDetails.computedExpectedBalance
                                        ? "border-green-500/30 bg-green-500/10"
                                        : "border-amber-500/30 bg-amber-500/10"
                                }`}>
                                    {parseFloat(closeBalance) === sessionDetails.computedExpectedBalance ? (
                                        <>
                                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                                            <span className="text-sm font-medium text-green-700">Écart nul — tout est en ordre</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                                            <span className="text-sm font-medium text-amber-700">
                                                Écart : {formatCurrency(parseFloat(closeBalance) - sessionDetails.computedExpectedBalance)}
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Notes de clôture (optionnel)</Label>
                                <Input
                                    value={closeNotes}
                                    onChange={(e) => setCloseNotes(e.target.value)}
                                    placeholder="Observations éventuelles"
                                />
                            </div>
                        </div>
                    ) : null}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloseDialog(false)}>Annuler</Button>
                        <Button onClick={handleCloseSession} disabled={!closeBalance}>
                            Clôturer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Movement Dialog */}
            <Dialog open={showMovementDialog} onOpenChange={setShowMovementDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            Mouvement de Caisse
                        </DialogTitle>
                        <DialogDescription>
                            Enregistrer une entrée ou sortie d&apos;espèces manuelle.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={movementType === "in" ? "default" : "outline"}
                                    className="flex-1"
                                    onClick={() => setMovementType("in")}
                                >
                                    <TrendingUp className="h-4 w-4 mr-1" />
                                    Entrée
                                </Button>
                                <Button
                                    type="button"
                                    variant={movementType === "out" ? "default" : "outline"}
                                    className="flex-1"
                                    onClick={() => setMovementType("out")}
                                >
                                    <TrendingDown className="h-4 w-4 mr-1" />
                                    Sortie
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Montant</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={movementAmount}
                                onChange={(e) => setMovementAmount(e.target.value)}
                                placeholder="Montant"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Motif</Label>
                            <Input
                                value={movementReason}
                                onChange={(e) => setMovementReason(e.target.value)}
                                placeholder="Ex: Dépôt banque, Appoint, etc."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowMovementDialog(false)}>Annuler</Button>
                        <Button onClick={handleAddMovement}>
                            Enregistrer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Session Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-primary" />
                            Détails de la Session
                        </DialogTitle>
                        <DialogDescription>
                            Récapitulatif complet de la session de caisse.
                        </DialogDescription>
                    </DialogHeader>
                    {detailsLoading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                    ) : sessionDetails ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">Caissier</p>
                                    <p className="font-medium">{sessionDetails.user?.name || "—"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Statut</p>
                                    <Badge variant="outline" className={
                                        sessionDetails.status === "open"
                                            ? "border-green-500/30 bg-green-500/10 text-green-700"
                                            : "border-gray-500/30 bg-gray-500/10 text-gray-700"
                                    }>
                                        {sessionDetails.status === "open" ? "Ouverte" : "Fermée"}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Ouverture</p>
                                    <p className="font-medium">{new Date(sessionDetails.openedAt).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Fermeture</p>
                                    <p className="font-medium">
                                        {sessionDetails.closedAt
                                            ? new Date(sessionDetails.closedAt).toLocaleString()
                                            : "—"}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Solde</h4>
                                <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Ouverture</span>
                                        <span>{formatCurrency(Number(sessionDetails.openingBalance))}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Ventes espèces</span>
                                        <span>+ {formatCurrency(sessionDetails.computedCashSales || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span>Paiements factures (espèces)</span>
                                        <span>+ {formatCurrency(sessionDetails.computedCreditCashPayments || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-blue-600">
                                        <span>Ventes carte</span>
                                        <span>{formatCurrency(sessionDetails.computedCardSales || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-indigo-600">
                                        <span>Paiements factures (carte)</span>
                                        <span>{formatCurrency(sessionDetails.computedCreditCardPayments || 0)}</span>
                                    </div>
                                    {sessionDetails.movements?.map((m: any) => (
                                        <div key={m.id} className="flex justify-between text-sm text-amber-600">
                                            <span>{m.type === "in" ? "Entrée manuelle" : "Sortie manuelle"} : {m.reason}</span>
                                            <span>{m.type === "in" ? "+" : "-"}{formatCurrency(Number(m.amount))}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-sm text-red-600">
                                        <span>Dépenses</span>
                                        <span>- {formatCurrency(sessionDetails.computedExpenses || 0)}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-bold">
                                        <span>Solde attendu</span>
                                        <span>{formatCurrency(sessionDetails.computedExpectedBalance || 0)}</span>
                                    </div>
                                    {sessionDetails.closingBalance !== null && (
                                        <>
                                            <div className="flex justify-between">
                                                <span>Solde physique</span>
                                                <span>{formatCurrency(Number(sessionDetails.closingBalance))}</span>
                                            </div>
                                            <div className={`flex justify-between font-bold text-base ${
                                                Number(sessionDetails.difference) === 0
                                                    ? "text-green-600"
                                                    : Number(sessionDetails.difference) > 0
                                                    ? "text-amber-600"
                                                    : "text-red-600"
                                            }`}>
                                                <span>Écart</span>
                                                <span>
                                                    {Number(sessionDetails.difference) > 0 ? "+" : ""}
                                                    {formatCurrency(Math.abs(Number(sessionDetails.difference || 0)))}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {sessionDetails.computedUnpaidDebts > 0 && (
                                <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                                    <div className="text-sm">
                                        <span className="font-medium text-orange-700">Total des dettes impayées : </span>
                                        <span className="font-bold text-orange-700">{formatCurrency(sessionDetails.computedUnpaidDebts)}</span>
                                    </div>
                                </div>
                            )}

                            {sessionDetails.notes && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Notes</p>
                                    <p className="text-sm italic">{sessionDetails.notes}</p>
                                </div>
                            )}
                        </div>
                    ) : null}
                    <DialogFooter>
                        {sessionDetails?.status === "open" && (
                            <Button
                                variant="destructive"
                                onClick={() => {
                                    setShowDetailsDialog(false)
                                    setShowCloseDialog(true)
                                }}
                                disabled={!canCloseSession}
                                title={!canCloseSession ? "Seul l'utilisateur qui a ouvert la caisse peut la fermer" : ""}
                            >
                                <Square className="mr-2 h-4 w-4" />
                                Clôturer la Caisse
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => handlePrintSession(selectedSession, sessionDetails)}>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimer
                        </Button>
                        <Button variant="outline" onClick={() => {
                            setShowDetailsDialog(false)
                            setSelectedSession(null)
                            setSessionDetails(null)
                        }}>
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
