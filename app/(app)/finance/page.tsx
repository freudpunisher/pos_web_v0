"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
} from "recharts"
import { Loader2, DollarSign, Package, Truck, TrendingUp, TrendingDown, BarChart3, Warehouse, Store, CalendarIcon, Printer, ChevronRight, ShoppingBag, MapPin } from "lucide-react"
import { printReport } from "@/lib/print-report"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useSettings } from "@/hooks/use-settings"

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899"]

export default function FinanceOverviewPage() {
    const { settings } = useSettings()
    const today = new Date()
    const [dateFrom, setDateFrom] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1))
    const [dateTo, setDateTo] = useState<Date>(today)
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const currencySymbol = settings?.currencySymbol || "Fbu"

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async (from?: Date, to?: Date) => {
        setLoading(true)
        try {
            const start = from || dateFrom
            const end = to || dateTo
            const params = new URLSearchParams({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            })
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

    const handleDateFilter = (from: Date, to: Date) => {
        setDateFrom(from)
        setDateTo(to)
        fetchData(from, to)
        fetchBarData(from, to)
        fetchCuisineData(from, to)
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

    const stockPieData = Object.entries(data.stockValue.byLocation).map(([key, val]: any) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: val.value,
    }))

    const profitBarData = Object.entries(data.byProductType || {}).map(([key, val]: any) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        Revenu: val.revenue,
        "Coût des ventes": val.cogs,
        Bénéfice: val.revenue - val.cogs,
    }))

    const formatCurrency = (val: number) =>
        val.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ` ${currencySymbol}`

    const handlePrint = () => {
        const period = `Période: ${format(dateFrom, "dd/MM/yyyy", { locale: fr })} — ${format(dateTo, "dd/MM/yyyy", { locale: fr })}`
        const stockRows = Object.entries(data.stockValue.byLocation).map(([key, val]: any) => ({
            location: key.charAt(0).toUpperCase() + key.slice(1),
            value: val.value,
            quantity: val.totalQty,
            products: val.productCount,
        }))
        const origin = window.location.origin
        printReport({
            title: "Situation Financière",
            subtitle: "Smart POS System — Vue d'ensemble",
            period,
            logoUrl: `${origin}/ahava.png`,
            metrics: [
                { label: "Valeur du Stock", value: formatCurrency(data.stockValue.total), highlight: true },
                { label: "Approvisionnements", value: formatCurrency(data.procurement.total) },
                { label: "Chiffre d'Affaires", value: formatCurrency(data.sales.total), highlight: true },
                { label: "Bénéfice Brut", value: formatCurrency(data.profit.grossProfit) },
                { label: "Marge", value: `${data.profit.margin.toFixed(1)}%` },
                { label: "Ventes (période)", value: String(data.sales.count) },
            ],
            columns: [
                { header: "Département", key: "dept" },
                { header: "Revenu", key: "revenue", format: "currency", align: "right" },
                { header: "Coût des ventes", key: "cogs", format: "currency", align: "right" },
                { header: "Bénéfice", key: "profit", format: "currency", align: "right" },
                { header: "Marge", key: "margin", align: "right" },
                { header: "Transactions", key: "transactions", align: "right" },
            ],
            rows: [
                ...Object.entries(data.byProductType || {}).map(([key, val]: any) => ({
                    dept: key.charAt(0).toUpperCase() + key.slice(1),
                    revenue: val.revenue,
                    cogs: val.cogs,
                    profit: val.revenue - val.cogs,
                    margin: val.revenue > 0 ? `${(((val.revenue - val.cogs) / val.revenue) * 100).toFixed(1)}%` : "0%",
                    transactions: val.count,
                })),
                {
                    dept: "Total",
                    revenue: data.sales.total,
                    cogs: data.profit.cogs,
                    profit: data.profit.grossProfit,
                    margin: `${data.profit.margin.toFixed(1)}%`,
                    transactions: data.sales.count,
                },
            ],
        })
        setTimeout(() => {
            if (stockRows.length > 0) {
                printReport({
                    title: "Stock par Emplacement",
                    subtitle: "Smart POS System",
                    period,
                    logoUrl: `${origin}/ahava.png`,
                    metrics: [
                        { label: "Valeur Totale du Stock", value: formatCurrency(data.stockValue.total), highlight: true },
                        ...stockRows.map((r: any) => ({
                            label: r.location,
                            value: formatCurrency(r.value),
                        })),
                    ],
                    columns: [
                        { header: "Emplacement", key: "location" },
                        { header: "Valeur", key: "value", format: "currency", align: "right" },
                        { header: "Quantité", key: "quantity", format: "number", align: "right" },
                        { header: "Produits", key: "products", format: "number", align: "right" },
                    ],
                    rows: stockRows,
                })
            }
        }, 800)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Finance</h1>
                    <p className="text-muted-foreground">Vue d&apos;ensemble de la valeur du stock, des approvisionnements et de la rentabilité</p>
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

            {/* Date Filter */}
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

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valeur du Stock</CardTitle>
                        <Package className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(data.stockValue.total)}</div>
                        <p className="text-xs text-muted-foreground">Valorisation totale de l&apos;inventaire</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approvisionnements</CardTitle>
                        <Truck className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{formatCurrency(data.procurement.total)}</div>
                        <p className="text-xs text-muted-foreground">{data.procurement.count} commandes reçues</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chiffre d&apos;Affaires</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(data.sales.total)}</div>
                        <p className="text-xs text-muted-foreground">{data.sales.count} ventes sur la période</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bénéfice Brut</CardTitle>
                        <DollarSign className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${data.profit.grossProfit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                            {formatCurrency(data.profit.grossProfit)}
                        </div>
                        <p className="text-xs text-muted-foreground">Marge {data.profit.margin.toFixed(1)}%</p>
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
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Rentabilité</TabsTrigger>
                    <TabsTrigger value="stock">Stock par Emplacement</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
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
                                    {Object.entries(data.stockValue.byLocation).map(([key, val]: any, idx: number) => (
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
                                    {Object.keys(data.stockValue.byLocation).length === 0 && (
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
