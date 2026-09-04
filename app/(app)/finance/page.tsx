"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
} from "recharts"
import { Loader2, DollarSign, Package, ShoppingBag, TrendingUp, TrendingDown, BarChart3, Warehouse, Store, CalendarIcon, Printer, ChevronRight, MapPin, Banknote } from "lucide-react"
import { printReport } from "@/lib/print-report"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useSettings } from "@/hooks/use-settings"
import { useLocations } from "@/hooks/use-locations"

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"]

export default function FinanceOverviewPage() {
    const { settings } = useSettings()
    const { locations } = useLocations()
    const today = new Date()
    const [dateFrom, setDateFrom] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1))
    const [dateTo, setDateTo] = useState<Date>(today)
    const [locationFilter, setLocationFilter] = useState("all")
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const currencySymbol = settings?.currencySymbol || "FC"

    const fetchData = async (from?: Date, to?: Date, locationId?: string) => {
        setLoading(true)
        try {
            const start = from || dateFrom
            const end = to || dateTo
            const loc = locationId !== undefined ? locationId : locationFilter
            const params = new URLSearchParams({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            })
            if (loc && loc !== "all") params.set("locationId", loc)
            const res = await fetch(`/api/finance/overview?${params}`)
            if (res.ok) {
                setData(await res.json())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleDateFilter = (from: Date, to: Date) => {
        setDateFrom(from)
        setDateTo(to)
        fetchData(from, to)
    }

    const handleLocationChange = (loc: string) => {
        setLocationFilter(loc)
        fetchData(dateFrom, dateTo, loc)
    }

    const presets = [
        {
            label: "Ce mois",
            action: () => {
                const now = new Date()
                handleDateFilter(new Date(now.getFullYear(), now.getMonth(), 1), now)
            },
        },
        {
            label: "Mois dernier",
            action: () => {
                const now = new Date()
                const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                const last = new Date(now.getFullYear(), now.getMonth(), 0)
                handleDateFilter(first, last)
            },
        },
        {
            label: "Cette année",
            action: () => {
                const now = new Date()
                handleDateFilter(new Date(now.getFullYear(), 0, 1), now)
            },
        },
        {
            label: "Tout",
            action: () => {
                const now = new Date()
                handleDateFilter(new Date(2020, 0, 1), now)
            },
        },
    ]

    if (loading || !data) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
                    <p className="text-muted-foreground">Chargement des données financières...</p>
                </div>
            </div>
        )
    }

    const formatCurrency = (val: number) =>
        val.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ` ${currencySymbol}`

    const stockPieData = Object.entries(data.stockValue.byLocation || {}).map(([key, val]: any) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: val.value,
    }))

    const cashFlowBarData = [
        { name: "Ventes (encaissé)", value: data.cashFlow.revenue, fill: "#10b981" },
        { name: "Achats", value: data.cashFlow.purchases, fill: "#f59e0b" },
        { name: "Dépenses", value: data.cashFlow.expenses, fill: "#ef4444" },
        { name: "Résultat net", value: data.cashFlow.net, fill: data.cashFlow.net >= 0 ? "#3b82f6" : "#ef4444" },
    ]

    const profitBarData = Object.entries(data.byProductType || {}).map(([key, val]: any) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        Revenu: val.revenue,
        "Coût des ventes": val.cogs,
        Bénéfice: val.revenue - val.cogs,
    }))

    const handlePrint = () => {
        const period = `Période: ${format(dateFrom, "dd/MM/yyyy", { locale: fr })} — ${format(dateTo, "dd/MM/yyyy", { locale: fr })}`
        printReport({
            title: "Situation Financière",
            subtitle: "Smart POS System — Vue d'ensemble",
            period,
            metrics: [
                { label: "Chiffre d'Affaires", value: formatCurrency(data.sales.total), highlight: true },
                { label: "Achats", value: formatCurrency(data.procurement.total) },
                { label: "Dépenses", value: formatCurrency(data.expenses.total) },
                { label: "Résultat Net (Trésorerie)", value: formatCurrency(data.cashFlow.net), highlight: true },
                { label: "Valeur du Stock", value: formatCurrency(data.stockValue.total) },
                { label: "Ventes (période)", value: String(data.sales.count) },
            ],
            columns: [
                { header: "Rubrique", key: "label" },
                { header: "Montant", key: "value", format: "currency", align: "right" },
            ],
            rows: [
                { label: "Encaissements (ventes espèces)", value: data.sales.total },
                { label: "Décaissements (achats)", value: -data.procurement.total },
                { label: "Décaissements (dépenses opérationnelles)", value: -data.expenses.total },
                { label: "Résultat net de trésorerie", value: data.cashFlow.net },
            ],
        })
    }

    const isFilteredByLocation = locationFilter !== "all"

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
                    <p className="text-muted-foreground">Trésorerie, ventes espèce et rentabilité par emplacement</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchData()}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Actualiser
                    </Button>
                    <Button variant="default" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimer
                    </Button>
                </div>
            </div>

            {/* Date & Location Filter */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: fr }) : "Date début"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dateFrom}
                                        onSelect={(d) => d && handleDateFilter(d, dateTo)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            <span className="text-muted-foreground">—</span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm" className="w-[160px] justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: fr }) : "Date fin"}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={dateTo}
                                        onSelect={(d) => d && handleDateFilter(dateFrom, d)}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <Select value={locationFilter} onValueChange={handleLocationChange}>
                                <SelectTrigger className="w-44">
                                    <SelectValue placeholder="Tous les emplacements" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        <span className="flex items-center gap-2">
                                            <Warehouse className="h-3.5 w-3.5" /> Tous les emplacements
                                        </span>
                                    </SelectItem>
                                    {locations.map((loc: any) => (
                                        <SelectItem key={loc.id} value={loc.id}>
                                            <span className="flex items-center gap-2">
                                                {loc.type === "primary" ? <Warehouse className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                                                {loc.name}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-1">
                            {presets.map((preset) => (
                                <Button key={preset.label} variant="secondary" size="sm" onClick={preset.action}>
                                    {preset.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {isFilteredByLocation && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                        Ventes filtrées par emplacement :{" "}
                        <span className="font-medium text-foreground">
                            {locations.find((l: any) => l.id === locationFilter)?.name || "—"}
                        </span>
                        {" "}— les achats et dépenses sont toutes locations confondues.
                    </span>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chiffre d&apos;Affaires</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(data.sales.total)}</div>
                        <p className="text-xs text-muted-foreground">{data.sales.count} ventes espèces sur la période</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Achats (fournisseurs)</CardTitle>
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{formatCurrency(data.procurement.total)}</div>
                        <p className="text-xs text-muted-foreground">{data.procurement.count} commandes reçues</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Dépenses opérationnelles</CardTitle>
                        <Banknote className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{formatCurrency(data.expenses.total)}</div>
                        <p className="text-xs text-muted-foreground">{data.expenses.count} dépenses enregistrées</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Résultat de trésorerie</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${data.cashFlow.net >= 0 ? "text-blue-600" : "text-destructive"}`}>
                            {formatCurrency(data.cashFlow.net)}
                        </div>
                        <p className="text-xs text-muted-foreground">Ventes − Achats − Dépenses</p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation to detail pages */}
            <div className="grid gap-4 md:grid-cols-2">
                <Link href="/finance/reports" className="block">
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-blue-200 dark:border-blue-800">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <BarChart3 className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold">Rapports Financiers</h3>
                                <p className="text-sm text-muted-foreground">Trésorerie et rentabilité globale</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/finance/expenses" className="block">
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-orange-200 dark:border-orange-800">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Banknote className="h-6 w-6 text-orange-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold">Dépenses</h3>
                                <p className="text-sm text-muted-foreground">Suivi des dépenses opérationnelles</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            <Tabs defaultValue="cashflow" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="cashflow">Trésorerie</TabsTrigger>
                    <TabsTrigger value="profit">Rentabilité</TabsTrigger>
                    <TabsTrigger value="stock">Stock par Emplacement</TabsTrigger>
                </TabsList>

                <TabsContent value="cashflow" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Flux de trésorerie</CardTitle>
                            <CardDescription>Ventes encaissées, achats et dépenses sur la période</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={cashFlowBarData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                                        <Legend />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {cashFlowBarData.map((entry, idx) => (
                                                <Cell key={idx} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Détail de trésorerie</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">Ventes (encaissé)</p>
                                        <p className="text-xs text-muted-foreground">Recettes en espèces</p>
                                    </div>
                                    <div className="font-medium text-emerald-600">+{formatCurrency(data.cashFlow.revenue)}</div>
                                </div>
                                <div className="flex items-center">
                                    <span className="flex h-2 w-2 rounded-full bg-amber-500 mr-2" />
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">Achats fournisseurs</p>
                                        <p className="text-xs text-muted-foreground">Commandes reçues</p>
                                    </div>
                                    <div className="font-medium text-amber-600">−{formatCurrency(data.cashFlow.purchases)}</div>
                                </div>
                                <div className="flex items-center">
                                    <span className="flex h-2 w-2 rounded-full bg-orange-500 mr-2" />
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">Dépenses opérationnelles</p>
                                        <p className="text-xs text-muted-foreground">Loyer, électricité, etc.</p>
                                    </div>
                                    <div className="font-medium text-orange-600">−{formatCurrency(data.cashFlow.expenses)}</div>
                                </div>
                                <div className="flex items-center border-t pt-4">
                                    <span className="flex h-2 w-2 rounded-full bg-blue-500 mr-2" />
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium leading-none">Résultat net de trésorerie</p>
                                        <p className="text-xs text-muted-foreground">Total entrées moins total sorties</p>
                                    </div>
                                    <div className={`font-bold ${data.cashFlow.net >= 0 ? "text-blue-600" : "text-destructive"}`}>
                                        {formatCurrency(data.cashFlow.net)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="profit" className="space-y-4">
                    {/* Product Type breakdown */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(data.byProductType || {}).map(([key, val]: any) => {
                            const profit = val.revenue - val.cogs
                            const margin = val.revenue > 0 ? (profit / val.revenue) * 100 : 0
                            return (
                                <Card key={key}>
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <Package className="h-5 w-5 text-primary" />
                                            <CardTitle className="text-lg capitalize">{key}</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">Revenu</p>
                                                    <p className="text-xl font-bold text-green-600">{formatCurrency(val.revenue)}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">Coût des ventes</p>
                                                    <p className="text-xl font-bold text-red-500">{formatCurrency(val.cogs)}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">Bénéfice</p>
                                                    <p className={`text-xl font-bold ${profit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                                                        {formatCurrency(profit)}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-xs text-muted-foreground">Marge</p>
                                                    <p className="text-xl font-bold">{margin.toFixed(1)}%</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 pt-2 border-t">
                                                <Badge variant="outline">{val.count} transactions</Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                        {Object.keys(data.byProductType || {}).length === 0 && (
                            <Card className="col-span-full">
                                <CardContent className="py-8 text-center text-muted-foreground">Aucune donnée de vente disponible</CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Profit Comparison Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Comparaison par Type de Produit</CardTitle>
                            <CardDescription>Revenu, coût des ventes et bénéfice par catégorie</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={profitBarData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                                        <Legend />
                                        <Bar dataKey="Revenu" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Coût des ventes" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="Bénéfice" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="stock" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Stock Value Pie Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Répartition du Stock par Emplacement</CardTitle>
                                <CardDescription>Valorisation par type de dépôt</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] flex items-center justify-center">
                                    {stockPieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stockPieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {stockPieData.map((_: any, idx: number) => (
                                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-muted-foreground">Aucun stock enregistré</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stock Value Details */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Détail par Emplacement</CardTitle>
                                <CardDescription>Valeur et quantité par dépôt</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {Object.entries(data.stockValue.byLocation || {}).map(([key, val]: any, idx: number) => (
                                        <div key={key} className="flex items-center gap-3 p-3 rounded-lg border">
                                            <div
                                                className="h-10 w-10 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: COLORS[idx % COLORS.length] + "20" }}
                                            >
                                                {key === "primary" ? (
                                                    <Warehouse className="h-5 w-5 text-green-500" />
                                                ) : key === "store" ? (
                                                    <Store className="h-5 w-5 text-blue-500" />
                                                ) : key === "branch" ? (
                                                    <MapPin className="h-5 w-5 text-purple-500" />
                                                ) : (
                                                    <Package className="h-5 w-5 text-amber-500" />
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium capitalize">{key}</p>
                                                <p className="text-xs text-muted-foreground">{val.productCount} produits</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold">{formatCurrency(val.value)}</p>
                                                <p className="text-xs text-muted-foreground">{val.totalQty} unités</p>
                                            </div>
                                        </div>
                                    ))}
                                    {Object.keys(data.stockValue.byLocation || {}).length === 0 && (
                                        <p className="text-muted-foreground text-center py-8">Aucune donnée de stock disponible</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
