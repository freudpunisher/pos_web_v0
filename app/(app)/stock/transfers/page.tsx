"use client"

import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { useStockTransfers } from "@/hooks/use-stock-transfers"
import { useUsers } from "@/hooks/use-users"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/mock-data"
import { printReport } from "@/lib/print-report"
import {
    ArrowRightLeft, Loader2, Plus, CheckCircle, Package,
    Warehouse, Store, Clock, User, FileText, XCircle,
    ChevronRight, ChevronLeft, Hash, CalendarDays, Beer, UtensilsCrossed,
    Layers, ListChecks, Printer, Search, X, RotateCcw
} from "lucide-react"

export default function StockTransfersPage() {
    const { transfers, loading, approveTransfer, receiveTransfer } = useStockTransfers()
    const { users } = useUsers()
    const { user } = useAuth()
    const currentUserId = user?.id || users[0]?.id || ""
    const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin" || user?.role === "stock_manager"
    const isManagerOrAdminOnly = user?.role === "manager" || user?.role === "admin"

    const [productFilter, setProductFilter] = useState("all")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [page, setPage] = useState(1)
    const pageSize = 10

    const productNames = useMemo(() => {
        const set = new Set<string>()
        transfers.forEach((t: any) => {
            const items = t.items || []
            items.forEach((i: any) => { if (i.product?.name) set.add(i.product.name) })
            if (t.product?.name) set.add(t.product.name)
        })
        return Array.from(set).sort()
    }, [transfers])

    const filteredTransfers = useMemo(() => {
        let filtered = transfers
        if (productFilter !== "all") {
            filtered = filtered.filter((t: any) => {
                const items = t.items || []
                return items.some((i: any) => i.product?.name === productFilter) || t.product?.name === productFilter
            })
        }
        if (startDate) {
            const s = new Date(startDate); s.setHours(0, 0, 0, 0)
            filtered = filtered.filter((t: any) => new Date(t.date) >= s)
        }
        if (endDate) {
            const e = new Date(endDate); e.setHours(23, 59, 59, 999)
            filtered = filtered.filter((t: any) => new Date(t.date) <= e)
        }
        return filtered
    }, [transfers, productFilter, startDate, endDate])

    const counts = useMemo(() => ({
        pending: transfers.filter((t: any) => t.status === "pending").length,
        approved: transfers.filter((t: any) => t.status === "approved").length,
        completed: transfers.filter((t: any) => t.status === "completed").length,
        cancelled: transfers.filter((t: any) => t.status === "cancelled").length,
    }), [transfers])

    const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / pageSize))
    const paginatedTransfers = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredTransfers.slice(start, start + pageSize)
    }, [filteredTransfers, page])

    useEffect(() => {
        setPage(1)
    }, [productFilter, startDate, endDate])

    const handleApprove = async (id: string) => {
        try { await approveTransfer(id, currentUserId) } catch (err: any) { alert(err.message) }
    }

    const handleReceive = async (id: string) => {
        try { await receiveTransfer(id, currentUserId) } catch (err: any) { alert(err.message) }
    }

    const StatusDot = ({ status }: { status: string }) => {
        const colors: Record<string, string> = {
            pending: "bg-amber-400",
            approved: "bg-blue-500",
            completed: "bg-emerald-500",
            cancelled: "bg-red-500",
        }
        return <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-gray-300"} shrink-0`} />
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Transferts de stock</h1>
                    <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                        <ArrowRightLeft className="h-4 w-4" />
                        Flux : Demande &rarr; Approbation &rarr; Réception
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => {
                        const origin = window.location.origin
                        const periodStr = [startDate, endDate].filter(Boolean).join(" au ") || "Toutes les dates"
                        printReport({
                            title: "Rapport des Transferts de Stock",
                            subtitle: "Smart POS System",
                            period: `Période : ${periodStr}`,
                            logoUrl: `${origin}/ahava.png`,
                            metrics: [
                                { label: "Total transferts", value: String(filteredTransfers.length), highlight: true },
                                { label: "En attente", value: String(filteredTransfers.filter((t: any) => t.status === "pending").length) },
                                { label: "Approuvés", value: String(filteredTransfers.filter((t: any) => t.status === "approved").length) },
                                { label: "Terminés", value: String(filteredTransfers.filter((t: any) => t.status === "completed").length), highlight: true },
                            ],
                            columns: [
                                { header: "Date", key: "date", format: "date" },
                                { header: "De", key: "from" },
                                { header: "Vers", key: "to" },
                                { header: "Articles", key: "items", align: "center" },
                                { header: "Qté", key: "qty", align: "right" },
                                { header: "Type", key: "type" },
                                { header: "Statut", key: "status" },
                            ],
                            rows: filteredTransfers.map((t: any) => {
                                const items = t.items || []
                                const totalQty = items.reduce((sum: number, i: any) => sum + i.quantity, 0) || t.quantity || 0
                                const itemCount = items.length || (t.productId ? 1 : 0)
                                return {
                                    date: t.date,
                                    from: t.fromLocation?.name || "—",
                                    to: t.toLocation?.name || "—",
                                    items: itemCount,
                                    qty: totalQty,
                                    type: t.transferType === "direct" ? "Direct" : "Demande",
                                    status: t.status === "completed" ? "Terminé" : t.status === "approved" ? "Approuvé" : t.status === "cancelled" ? "Annulé" : "En attente",
                                }
                            }),
                        })
                    }} disabled={filteredTransfers.length === 0}>
                        <Printer className="h-4 w-4 mr-1.5" /> Imprimer
                    </Button>
                    {isManagerOrAdminOnly && (
                        <Button size="sm" variant="outline" asChild>
                            <Link href="/stock/transfers/to-transitional">
                                <Layers className="h-4 w-4 mr-1.5" /> Réapprovisionner le stock de transition
                            </Link>
                        </Button>
                    )}
                    {user?.role !== "stock_manager" && (
                        <Button size="sm" variant="outline" asChild>
                            <Link href="/stock/transfers/to-bar">
                                <Beer className="h-4 w-4 mr-1.5" /> Demande au bar
                            </Link>
                        </Button>
                    )}
                    {isManagerOrAdminOnly && (
                        <Button size="sm" variant="outline" asChild>
                            <Link href="/stock/transfers/sortie-bar">
                                <Beer className="h-4 w-4 mr-1.5" /> Sortie bar
                            </Link>
                        </Button>
                    )}
                    {isManagerOrAdmin && (
                        <Button size="sm" variant="outline" asChild>
                            <Link href="/stock/transfers/sortie-cuisine">
                                <UtensilsCrossed className="h-4 w-4 mr-1.5" /> Sortie cuisine
                            </Link>
                        </Button>
                    )}
                    {isManagerOrAdmin && (
                        <Button size="sm" variant="outline" asChild>
                            <Link href="/stock/transfers/retour-cuisine">
                                <RotateCcw className="h-4 w-4 mr-1.5" /> Retour cuisine
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "En attente", count: counts.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
                    { label: "Approuvé", count: counts.approved, icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
                    { label: "Terminé", count: counts.completed, icon: Package, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                    { label: "Total", count: transfers.length, icon: ArrowRightLeft, color: "text-primary", bg: "bg-primary/10" },
                ].map((s) => (
                    <Card key={s.label} className="border-border/50">
                        <CardContent className="p-4 md:p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                                    <p className="text-2xl md:text-3xl font-bold mt-1">{s.count}</p>
                                </div>
                                <div className={`h-10 w-10 rounded-full ${s.bg} flex items-center justify-center`}>
                                    <s.icon className={`h-5 w-5 ${s.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="border-border/50">
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 max-w-xs">
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

            {/* Transfer List */}
            <div className="space-y-3">
                {loading ? (
                    <Card>
                        <CardContent className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                <p className="mt-3 text-sm text-muted-foreground">Chargement des transferts...</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : filteredTransfers.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <ArrowRightLeft className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <p className="text-lg font-medium text-muted-foreground">Aucun transfert pour l'instant</p>
                            <p className="text-sm text-muted-foreground mt-1">Créez votre première demande de transfert pour commencer.</p>
                            <Button className="mt-6" asChild>
                                <Link href="/stock/transfers/new">
                                    <Plus className="h-4 w-4 mr-2" /> Nouvelle demande
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        <div className="space-y-3">
                            {paginatedTransfers.map((t: any) => {
                                const items = t.items || []
                                const totalQty = items.reduce((sum: number, i: any) => sum + i.quantity, 0) || t.quantity || 0
                                const itemCount = items.length || (t.productId ? 1 : 0)

                                return (
                                    <Card key={t.id} className="border-border/50 hover:border-border transition-colors">
                                        <CardContent className="p-0">
                                            <div className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                                                {/* Left: Status indicator + info */}
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className={`hidden md:flex h-10 w-10 rounded-full items-center justify-center shrink-0 ${t.status === "completed" ? "bg-emerald-500/10" :
                                                        t.status === "approved" ? "bg-blue-500/10" :
                                                            t.status === "cancelled" ? "bg-red-500/10" :
                                                                "bg-amber-500/10"
                                                        }`}>
                                                        {t.status === "completed" ? <CheckCircle className="h-5 w-5 text-emerald-500" /> :
                                                            t.status === "approved" ? <CheckCircle className="h-5 w-5 text-blue-500" /> :
                                                                t.status === "cancelled" ? <XCircle className="h-5 w-5 text-red-500" /> :
                                                                    <Clock className="h-5 w-5 text-amber-500" />}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge variant="outline" className="text-xs flex items-center gap-1.5 py-1">
                                                                <CalendarDays className="h-3 w-3" />
                                                                {new Date(t.date).toLocaleDateString()}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">•</span>
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Hash className="h-3 w-3" />
                                                                {itemCount} article{itemCount !== 1 ? "s" : ""}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">•</span>
                                                            <span className="text-xs font-medium">{totalQty} unités</span>
                                                            <span className="text-xs text-muted-foreground">•</span>
                                                            <Badge variant={t.transferType === "direct" ? "secondary" : "outline"} className="text-xs">
                                                                {t.transferType === "direct" ? "Direct" : "Demande"}
                                                            </Badge>
                                                        </div>

                                                        {/* Items */}
                                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                                            {(items.length > 0 ? items : (t.productId ? [{ product: t.product, quantity: t.quantity }] : [])).map((it: any, idx: number) => (
                                                                <Badge key={idx} variant="secondary" className="text-xs font-normal gap-1">
                                                                    <Package className="h-3 w-3" />
                                                                    {it.product?.name || "—"}
                                                                    <span className="font-semibold">×{it.quantity}</span>
                                                                </Badge>
                                                            ))}
                                                        </div>

                                                        {/* Route */}
                                                        <div className="mt-2 flex items-center gap-1.5 text-sm">
                                                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                                <Warehouse className="h-3 w-3" /> {t.fromLocation?.name}
                                                            </Badge>
                                                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                                                                <Store className="h-3 w-3" /> {t.toLocation?.name}
                                                            </Badge>
                                                        </div>

                                                        {t.notes && (
                                                            <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1">
                                                                <FileText className="h-3 w-3 shrink-0" /> {t.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: Status + Actions */}
                                                <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-2 shrink-0 md:pl-4 md:border-l border-border/50">
                                                    <div className="flex items-center gap-2">
                                                        <StatusDot status={t.status} />
                                                        <span className={`text-sm font-semibold capitalize ${t.status === "completed" ? "text-emerald-600" :
                                                            t.status === "approved" ? "text-blue-600" :
                                                                t.status === "cancelled" ? "text-red-600" :
                                                                    "text-amber-600"
                                                            }`}>{t.status}</span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <User className="h-3 w-3" />
                                                        {t.user?.name || "—"}
                                                    </div>

                                                    {t.approver?.name && t.status === "approved" && (
                                                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                            <CheckCircle className="h-3 w-3 text-blue-500" />
                                                            Approuvé par {t.approver.name}
                                                        </div>
                                                    )}

                                                    {t.status === "pending" && t.transferType === "demand" && isManagerOrAdmin && (
                                                        <Button size="sm" variant="default" onClick={() => handleApprove(t.id)} className="w-full md:w-auto">
                                                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Approuver
                                                        </Button>
                                                    )}
                                                    {t.status === "approved" && t.transferType === "demand" && (t.userId === currentUserId || isManagerOrAdminOnly) && (
                                                        <Button size="sm" onClick={() => handleReceive(t.id)} className="w-full md:w-auto">
                                                            <Package className="h-3.5 w-3.5 mr-1.5" /> Recevoir
                                                        </Button>
                                                    )}
                                                    {t.status === "completed" && (
                                                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 gap-1">
                                                            <CheckCircle className="h-3.5 w-3.5" /> Terminé
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-2">
                                <p className="text-sm text-muted-foreground">
                                    {filteredTransfers.length} résultat{filteredTransfers.length > 1 ? "s" : ""}
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
                    </>
                )}
            </div>


        </div>
    )
}
