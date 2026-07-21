"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Plus,
    Search,
    Loader2,
    Trash2,
    Wallet,
    TrendingDown,
    Calendar,
    Tag,
    FileText,
    AlertCircle,
    PiggyBank,
    X,
    ChevronLeft,
    ChevronRight,
    Eye,
    CheckCircle,
    ShieldCheck,
    Pencil,
} from "lucide-react"
import { useExpenses } from "@/hooks/use-expenses"
import { useUsers } from "@/hooks/use-users"
import { useAuth } from "@/lib/auth-context"
import Swal from "sweetalert2"
import { formatCurrency } from "@/lib/mock-data"
import type { ExpenseCategory } from "@/lib/types"

const categoryConfig: Record<ExpenseCategory, { label: string; color: string; icon: string }> = {
    rent: { label: "Loyer", color: "bg-blue-500/20 text-blue-600 border-blue-500/30", icon: "🏠" },
    utilities: { label: "Services publics", color: "bg-yellow-500/20 text-yellow-600 border-yellow-500/30", icon: "⚡" },
    salaries: { label: "Salaires", color: "bg-green-500/20 text-green-600 border-green-500/30", icon: "👤" },
    supplies: { label: "Fournitures", color: "bg-purple-500/20 text-purple-600 border-purple-500/30", icon: "📦" },
    maintenance: { label: "Maintenance", color: "bg-orange-500/20 text-orange-600 border-orange-500/30", icon: "🔧" },
    marketing: { label: "Marketing", color: "bg-pink-500/20 text-pink-600 border-pink-500/30", icon: "📢" },
    transport: { label: "Transport", color: "bg-cyan-500/20 text-cyan-600 border-cyan-500/30", icon: "🚚" },
    insurance: { label: "Assurance", color: "bg-indigo-500/20 text-indigo-600 border-indigo-500/30", icon: "🛡️" },
    taxes: { label: "Taxes", color: "bg-red-500/20 text-red-600 border-red-500/30", icon: "🏛️" },
    other: { label: "Autre", color: "bg-gray-500/20 text-gray-600 border-gray-500/30", icon: "📋" },
}

export default function ExpensesPage() {
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState<string>("all")
    const [showDialog, setShowDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [showDetailDialog, setShowDetailDialog] = useState(false)
    const [selectedExpense, setSelectedExpense] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [page, setPage] = useState(1)
    const pageSize = 20

    const { expenses, loading, createExpense, deleteExpense, validateExpense, updateExpense } = useExpenses()
    const { users } = useUsers()
    const { user } = useAuth()

    const [formData, setFormData] = useState({
        name: "",
        amount: "",
        category: "other" as ExpenseCategory,
        description: "",
        date: new Date().toISOString().split("T")[0],
    })

    const [editFormData, setEditFormData] = useState({
        name: "",
        amount: "",
        category: "other" as ExpenseCategory,
        description: "",
        date: "",
    })

    const expensesInRange = useMemo(() => {
        const today = new Date()
        const start = startDate ? new Date(startDate) : new Date(today)
        start.setHours(0, 0, 0, 0)
        const end = endDate ? new Date(endDate) : new Date(today)
        end.setHours(23, 59, 59, 999)
        return expenses.filter((e: any) => {
            const d = new Date(e.date)
            return d >= start && d <= end
        })
    }, [expenses, startDate, endDate])

    const filtered = useMemo(() => {
        let items = expensesInRange
        if (categoryFilter !== "all") {
            items = items.filter(e => e.category === categoryFilter)
        }
        if (search) {
            const q = search.toLowerCase()
            items = items.filter(e =>
                e.name.toLowerCase().includes(q) ||
                (e.description || "").toLowerCase().includes(q)
            )
        }
        return items
    }, [expensesInRange, search, categoryFilter])

    const dateTotal = useMemo(() =>
        expensesInRange.reduce((sum, e) => sum + Number(e.amount), 0),
        [expensesInRange]
    )

    const totalAmount = useMemo(() =>
        filtered.reduce((sum, e) => sum + Number(e.amount), 0),
        [filtered]
    )

    const categoryTotals = useMemo(() => {
        const map: Record<string, number> = {}
        for (const e of expensesInRange) {
            map[e.category] = (map[e.category] || 0) + Number(e.amount)
        }
        return map
    }, [expensesInRange])

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
    const paginatedExpenses = useMemo(() => {
        const start = (page - 1) * pageSize
        return filtered.slice(start, start + pageSize)
    }, [filtered, page])

    useEffect(() => {
        setPage(1)
    }, [search, startDate, endDate, categoryFilter])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setIsSubmitting(true)
        try {
            await createExpense({
                ...formData,
                amount: parseFloat(formData.amount),
                userId: user.id,
                date: new Date(formData.date).toISOString(),
            })
            setShowDialog(false)
            setFormData({
                name: "",
                amount: "",
                category: "other",
                description: "",
                date: new Date().toISOString().split("T")[0],
            })
        } catch {
            // handled by hook
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedExpense) return
        setIsSubmitting(true)
        try {
            await updateExpense(selectedExpense.id, {
                ...editFormData,
                amount: parseFloat(editFormData.amount),
                date: new Date(editFormData.date).toISOString(),
            })
            setShowEditDialog(false)
            setSelectedExpense(null)
        } catch {
            // handled by hook
        } finally {
            setIsSubmitting(false)
        }
    }

    useEffect(() => {
        if (selectedExpense) {
            setEditFormData({
                name: selectedExpense.name,
                amount: String(selectedExpense.amount),
                category: selectedExpense.category as ExpenseCategory,
                description: selectedExpense.description || "",
                date: new Date(selectedExpense.date).toISOString().split("T")[0],
            })
        }
    }, [selectedExpense])

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Dépenses</h2>
                    <p className="text-muted-foreground">Suivez et gérez toutes les dépenses professionnelles</p>
                </div>
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Plus className="mr-2 h-4 w-4" />
                            Nouvelle dépense
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px] border-border/50 shadow-2xl backdrop-blur-xl bg-card/90">
                        <form onSubmit={handleSubmit}>
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                    <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                                        <TrendingDown className="h-6 w-6 text-destructive" />
                                    </div>
                                    Enregistrer une dépense
                                </DialogTitle>
                                <DialogDescription className="text-base italic">
                                    Saisissez les détails de la dépense pour tenir des registres financiers précis.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-6 py-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-primary/80">Nom de la dépense</Label>
                                    <Input
                                        placeholder="ex. Facture d'électricité"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-background/50 border-border/50 hover:border-primary/50"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-primary/80">Montant</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="bg-background/50 border-border/50 focus:border-primary font-bold text-lg"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-primary/80">Catégorie</Label>
                                        <Select
                                            value={formData.category}
                                            onValueChange={(val) => setFormData({ ...formData, category: val as ExpenseCategory })}
                                        >
                                            <SelectTrigger className="bg-background/50 border-border/50">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {Object.entries(categoryConfig).map(([key, cfg]) => (
                                                    <SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-primary/80">Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="bg-background/50 border-border/50"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-primary/80">Description (Optionnelle)</Label>
                                    <Input
                                        placeholder="Détails supplémentaires sur cette dépense"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="bg-background/50 border-border/50"
                                    />
                                </div>
                            </div>
                            <DialogFooter className="bg-secondary/5 -mx-6 -mb-6 p-6 rounded-b-lg border-t border-border/50">
                                <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="border-border/50">
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={isSubmitting} className="min-w-[170px] bg-gradient-to-r from-destructive to-destructive/80 hover:shadow-destructive/30 shadow-lg transition-all">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                                    Enregistrer la dépense
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Date Filter */}
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-44 bg-background/50 border-border/50"
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-44 bg-background/50 border-border/50"
                    />
                    {(startDate || endDate) && (
                        <Button variant="ghost" size="sm" onClick={() => { setStartDate(""); setEndDate("") }}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total des dépenses</p>
                                <p className="text-3xl font-black text-foreground mt-1">{expensesInRange.length}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                <TrendingDown className="h-6 w-6 text-destructive" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Montant total</p>
                                <p className="text-3xl font-black text-destructive mt-1">{formatCurrency(dateTotal)}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                                <Wallet className="h-6 w-6 text-destructive" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ce filtre</p>
                                <p className="text-3xl font-black text-accent mt-1">{formatCurrency(totalAmount)}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                                <PiggyBank className="h-6 w-6 text-accent" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/30 backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02]">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Catégories</p>
                                <p className="text-3xl font-black text-foreground mt-1">{Object.keys(categoryTotals).length}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Tag className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category breakdown */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant={categoryFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("all")}
                >
                    Tout
                </Button>
                {Object.entries(categoryConfig).map(([key, cfg]) => (
                    <Button
                        key={key}
                        variant={categoryFilter === key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCategoryFilter(key)}
                        className="relative"
                    >
                        {cfg.label}
                        {categoryTotals[key] > 0 && (
                            <span className="ml-1.5 text-xs opacity-60">
                                ({formatCurrency(categoryTotals[key])})
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {/* Table */}
            <Card className="border-border/50 shadow-2xl overflow-hidden backdrop-blur-md bg-card/70 border-t-4 border-t-destructive/20">
                <CardHeader className="border-b border-border/50 bg-secondary/10 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <Wallet className="h-5 w-5 text-destructive" />
                            Registre des dépenses
                            <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>
                        </CardTitle>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Rechercher des dépenses..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 bg-background/50 border-border/50"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-secondary/10 hover:bg-secondary/10 border-border/50">
                                <TableHead className="font-bold">Date</TableHead>
                                <TableHead className="font-bold">Nom</TableHead>
                                <TableHead className="font-bold">Catégorie</TableHead>
                                <TableHead className="text-right font-bold">Montant</TableHead>
                                <TableHead className="font-bold">Description</TableHead>
                                <TableHead className="font-bold">Enregistré par</TableHead>
                                <TableHead className="text-right font-bold">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                        <p className="mt-2 text-sm text-muted-foreground">Chargement des dépenses...</p>
                                    </TableCell>
                                </TableRow>
                            )}
                            {!loading && filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">
                                        <div className="flex flex-col items-center gap-2">
                                            <Wallet className="h-12 w-12 opacity-10" />
                                            <p className="text-lg font-medium">Aucune dépense trouvée</p>
                                            <p className="text-sm">Enregistrez votre première dépense pour commencer le suivi.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                            {paginatedExpenses.map((exp) => {
                                const cfg = categoryConfig[exp.category as ExpenseCategory] || categoryConfig.other
                                return (
                                    <TableRow key={exp.id} className="border-border/50 hover:bg-secondary/5 transition-colors group">
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                {new Date(exp.date).toLocaleDateString(undefined, {
                                                    day: "numeric", month: "short", year: "numeric"
                                                })}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-foreground">{exp.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`font-bold text-xs ${cfg.color}`}>
                                                {cfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-black text-destructive text-lg">
                                                -{formatCurrency(Number(exp.amount))}
                                            </span>
                                        </TableCell>
                                        <TableCell className="max-w-[200px]">
                                            <p className="text-xs text-muted-foreground truncate">
                                                {exp.description || <span className="italic opacity-40">Aucune description</span>}
                                            </p>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {exp.user?.name || "—"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                    onClick={() => {
                                                        setSelectedExpense(exp)
                                                        setShowDetailDialog(true)
                                                    }}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {!exp.validated && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-amber-600"
                                                            onClick={() => {
                                                                setSelectedExpense(exp)
                                                                setShowEditDialog(true)
                                                            }}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-green-600"
                                                            onClick={async () => {
                                                                const result = await Swal.fire({
                                                                    title: "Valider cette dépense ?",
                                                                    text: `Êtes-vous sûr de vouloir valider "${exp.name}" ? Cette action est irréversible.`,
                                                                    icon: "warning",
                                                                    showCancelButton: true,
                                                                    confirmButtonColor: "#16a34a",
                                                                    cancelButtonColor: "#6b7280",
                                                                    confirmButtonText: "Oui, valider",
                                                                    cancelButtonText: "Annuler",
                                                                })
                                                                if (result.isConfirmed) {
                                                                    await validateExpense(exp.id)
                                                                    await Swal.fire({ icon: "success", title: "Dépense validée", timer: 1500, showConfirmButton: false })
                                                                }
                                                            }}
                                                        >
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={async () => {
                                                                const result = await Swal.fire({
                                                                    title: "Supprimer cette dépense ?",
                                                                    text: `Êtes-vous sûr de vouloir supprimer "${exp.name}" ? Cette action est irréversible.`,
                                                                    icon: "warning",
                                                                    showCancelButton: true,
                                                                    confirmButtonColor: "#d33",
                                                                    cancelButtonColor: "#6b7280",
                                                                    confirmButtonText: "Oui, supprimer",
                                                                    cancelButtonText: "Annuler",
                                                                })
                                                                if (result.isConfirmed) {
                                                                    await deleteExpense(exp.id)
                                                                    await Swal.fire({ icon: "success", title: "Dépense supprimée", timer: 1500, showConfirmButton: false })
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                                {exp.validated && (
                                                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-xs">
                                                        <ShieldCheck className="h-3 w-3 mr-1" />
                                                        Validée
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-border/50 bg-secondary/10 px-4 py-3">
                        <p className="text-sm text-muted-foreground">
                            {filtered.length} résultat{(filtered.length > 1 ? "s" : "")}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium">
                                {page} / {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Edit Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[500px] border-border/50 shadow-2xl backdrop-blur-xl bg-card/90">
                    <form onSubmit={handleEditSubmit}>
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Pencil className="h-6 w-6 text-amber-500" />
                                </div>
                                Modifier la dépense
                            </DialogTitle>
                            <DialogDescription className="text-base italic">
                                Modifiez les détails de cette dépense.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-primary/80">Nom de la dépense</Label>
                                <Input
                                    placeholder="ex. Facture d'électricité"
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="bg-background/50 border-border/50 hover:border-primary/50"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-primary/80">Montant</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={editFormData.amount}
                                        onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                                        className="bg-background/50 border-border/50 focus:border-primary font-bold text-lg"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold text-primary/80">Catégorie</Label>
                                    <Select
                                        value={editFormData.category}
                                        onValueChange={(val) => setEditFormData({ ...editFormData, category: val as ExpenseCategory })}
                                    >
                                        <SelectTrigger className="bg-background/50 border-border/50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {Object.entries(categoryConfig).map(([key, cfg]) => (
                                                <SelectItem key={key} value={key}>{cfg.icon} {cfg.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-primary/80">Date</Label>
                                <Input
                                    type="date"
                                    value={editFormData.date}
                                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                                    className="bg-background/50 border-border/50"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-bold text-primary/80">Description (Optionnelle)</Label>
                                <Input
                                    placeholder="Détails supplémentaires sur cette dépense"
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    className="bg-background/50 border-border/50"
                                />
                            </div>
                        </div>
                        <DialogFooter className="bg-secondary/5 -mx-6 -mb-6 p-6 rounded-b-lg border-t border-border/50">
                            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="border-border/50">
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="min-w-[170px] bg-gradient-to-r from-amber-500 to-amber-600 hover:shadow-amber-500/30 shadow-lg transition-all">
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
                                Enregistrer les modifications
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
                <DialogContent className="sm:max-w-[500px] border-border/50 shadow-2xl backdrop-blur-xl bg-card/90">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-primary" />
                            </div>
                            Détails de la dépense
                        </DialogTitle>
                        <DialogDescription className="text-base italic">
                            Informations complètes sur cette dépense.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedExpense && (
                        <div className="grid gap-4 py-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-muted-foreground">Statut</span>
                                {selectedExpense.validated ? (
                                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                                        <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                        Validée
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
                                        En attente
                                    </Badge>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nom</p>
                                    <p className="text-lg font-bold">{selectedExpense.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Montant</p>
                                    <p className="text-lg font-black text-destructive">-{formatCurrency(Number(selectedExpense.amount))}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Catégorie</p>
                                    <Badge variant="outline" className={`font-bold text-xs ${(categoryConfig[selectedExpense.category as ExpenseCategory] || categoryConfig.other).color}`}>
                                        {(categoryConfig[selectedExpense.category as ExpenseCategory] || categoryConfig.other).label}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</p>
                                    <p className="text-sm font-medium">{new Date(selectedExpense.date).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enregistré par</p>
                                <p className="text-sm font-medium">{selectedExpense.user?.name || "—"}</p>
                            </div>
                            {selectedExpense.description && (
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
                                    <p className="text-sm text-muted-foreground">{selectedExpense.description}</p>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter className="bg-secondary/5 -mx-6 -mb-6 p-6 rounded-b-lg border-t border-border/50">
                        <Button variant="outline" onClick={() => setShowDetailDialog(false)} className="border-border/50">
                            Fermer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
