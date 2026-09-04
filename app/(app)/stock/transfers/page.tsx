"use client"

import Link from "next/link"
import { useState, useMemo, useEffect } from "react"
import { useStockTransfers } from "@/hooks/use-stock-transfers"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { printReport } from "@/lib/print-report"
import {
    ArrowRightLeft, Loader2, Plus, Package,
    Warehouse, Store, User, FileText, XCircle,
    ChevronRight, ChevronLeft, Hash, CalendarDays,
    Printer, Search, X, MapPin, Building2, ArrowRight, CheckCircle, Clock
} from "lucide-react"

export default function StockTransfersPage() {
    const { transfers, loading } = useStockTransfers()
    const { user } = useAuth()
    const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin" || user?.role === "stock_manager"

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
        completed: transfers.filter((t: any) => t.status === "completed").length,
        cancelled: transfers.filter((t: any) => t.status === "cancelled").length,
    }), [transfers])

    const totalPages = Math.max(1, Math.ceil(filteredTransfers.length / pageSize))
    const paginatedTransfers = useMemo(() => {
        const start = (page - 1) * pageSize
        return filteredTransfers.slice(start, start + pageSize)
    }, [filteredTransfers, page])

    useEffect(() => { setPage(1) }, [productFilter, startDate, endDate])

    const getStatusConfig = (status: string) => {
        switch (status) {
            case "completed":
                return { label: "Terminé", color: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", icon: CheckCircle, iconColor: "text-emerald-500" }
            case "approved":
                return { label: "Approuvé", color: "text-blue-700 dark:text-blue-400", border: "border-blue-500/30", bg: "bg-blue-500/10", icon: CheckCircle, iconColor: "text-blue-500" }
            case "cancelled":
                return { label: "Annulé", color: "text-red-700 dark:text-red-400", border: "border-red-500/30", bg: "bg-red-500/10", icon: XCircle, iconColor: "text-red-500" }
            default:
                return { label: "En attente", color: "text-amber-700 dark:text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", icon: Clock, iconColor: "text-amber-500" }
        }
    }

    const getLocationIcon = (type: string) => {
        switch (type) {
            case "primary": return Warehouse
            case "store": return Store
            case "branch": return MapPin
            case "delivery_point": return Building2
            default: return Store
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transferts de stock</h1>
                    <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                        <ArrowRightLeft className="h-4 w-4" />
                        Déplacement direct entre emplacements
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
                                { label: "Demandes en attente", value: String(filteredTransfers.filter((t: any) => t.status === "pending" && t.transferType === "demand").length) },
                                { label: "Demandes approuvées", value: String(filteredTransfers.filter((t: any) => t.status === "approved" && t.transferType === "demand").length) },
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
                    <Button size="sm" asChild>
                        <Link href="/stock/transfers/new">
                            <Plus className="h-4 w-4 mr-1.5" /> Nouveau transfert
                        </Link>
                    </Button>
                    {isManagerOrAdmin && (
                        <Button size="sm" variant="outline" asChild>
                            <Link href="/stock/transfers/sortie-bar">
                                <Store className="h-4 w-4 mr-1.5" /> Sortie de stock
                            </Link>
                        </Button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Terminé", count: counts.completed, icon: Package, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                    { label: "Annulé", count: counts.cancelled, icon: XCircle, color: "text-red-600", bg: "bg-red-500/10" },
                    { label: "Total", count: transfers.length, icon: ArrowRightLeft, color: "text-primary", bg: "bg-primary/10" },
                ].map((s) => (
                    <Card key={s.label} className="border-border/50 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                                    <p className="text-2xl font-bold tracking-tight">{s.count}</p>
                                </div>
                                <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                                    <s.icon className={`h-5 w-5 ${s.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Filters */}
            <Card className="border-border/50 shadow-sm">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="relative flex-1 max-w-md">
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
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
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

            {/* Transfer List */}
            <div className="space-y-3">
                {loading ? (
                    <Card className="border-border/50 shadow-sm">
                        <CardContent className="flex items-center justify-center py-16">
                            <div className="text-center">
                                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                <p className="mt-3 text-sm text-muted-foreground">Chargement des transferts...</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : filteredTransfers.length === 0 ? (
                    <Card className="border-border/50 shadow-sm">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                                <ArrowRightLeft className="h-7 w-7 text-muted-foreground/50" />
                            </div>
                            <p className="text-base font-medium text-muted-foreground">Aucun transfert pour l&apos;instant</p>
                            <p className="text-sm text-muted-foreground/70 mt-1">Créez votre première demande de transfert pour commencer</p>
                            <Button className="mt-6" size="sm" asChild>
                                <Link href="/stock/transfers/new">
                                    <Plus className="h-4 w-4 mr-1.5" /> Nouvelle demande
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
                                const statusConfig = getStatusConfig(t.status)
                                const StatusIcon = statusConfig.icon
                                const FromIcon = getLocationIcon(t.fromLocation?.type)
                                const ToIcon = getLocationIcon(t.toLocation?.type)

                                return (
                                    <Card key={t.id} className="border-border/50 shadow-sm hover:border-border transition-colors">
                                        <CardContent className="p-0">
                                            <div className="flex flex-col md:flex-row md:items-center gap-4 p-5">
                                                {/* Left: Status indicator + info */}
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className={`hidden md:flex h-11 w-11 rounded-full items-center justify-center shrink-0 ${statusConfig.bg}`}>
                                                        <StatusIcon className={`h-5 w-5 ${statusConfig.iconColor}`} />
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge variant="outline" className="text-xs gap-1 py-0.5">
                                                                <CalendarDays className="h-3 w-3" />
                                                                {new Date(t.date).toLocaleDateString()}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">·</span>
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Hash className="h-3 w-3" />
                                                                {itemCount} article{itemCount !== 1 ? "s" : ""}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">·</span>
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
                                                        <div className="mt-2.5 flex items-center gap-2 text-sm">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted">
                                                                    <FromIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                                </div>
                                                                <span className="text-xs font-medium">{t.fromLocation?.name}</span>
                                                            </div>
                                                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                                                                    <ToIcon className="h-3.5 w-3.5 text-primary" />
                                                                </div>
                                                                <span className="text-xs font-medium">{t.toLocation?.name}</span>
                                                            </div>
                                                        </div>

                                                        {t.notes && (
                                                            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                                                                <FileText className="h-3 w-3 shrink-0" /> {t.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: Status + Actions */}
                                                <div className="flex md:flex-col items-center md:items-end gap-3 md:gap-2 shrink-0 md:pl-4 md:border-l border-border/50">
                                                    <Badge variant="outline" className={`text-xs font-medium ${statusConfig.color} ${statusConfig.border} ${statusConfig.bg} gap-1`}>
                                                        <StatusIcon className="h-3 w-3" /> {statusConfig.label}
                                                    </Badge>

                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        <User className="h-3 w-3" />
                                                        {t.user?.name || "—"}
                                                    </div>
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
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium">{page} / {totalPages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
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
