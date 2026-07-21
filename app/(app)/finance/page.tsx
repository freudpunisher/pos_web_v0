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
import { Loader2, DollarSign, Package, Truck, TrendingUp, TrendingDown, BarChart3, Beer, Utensils, Warehouse, Store, CalendarIcon, Printer, ChevronRight, ShoppingBag } from "lucide-react"
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
    const [barData, setBarData] = useState<any>(null)
    const [barLoading, setBarLoading] = useState(false)
    const [cuisineData, setCuisineData] = useState<any>(null)
    const [cuisineLoading, setCuisineLoading] = useState(false)

    const currencySymbol = settings?.currencySymbol || "Fbu"

    useEffect(() => {
        fetchData()
        fetchBarData()
        fetchCuisineData()
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

    const fetchBarData = async (from?: Date, to?: Date) => {
        setBarLoading(true)
        try {
            const start = from || dateFrom
            const end = to || dateTo
            const params = new URLSearchParams({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            })
            const res = await fetch(`/api/finance/bar?${params}`)
            if (res.ok) {
                setBarData(await res.json())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setBarLoading(false)
        }
    }

    const fetchCuisineData = async (from?: Date, to?: Date) => {
        setCuisineLoading(true)
        try {
            const start = from || dateFrom
            const end = to || dateTo
            const params = new URLSearchParams({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            })
            const res = await fetch(`/api/finance/cuisine?${params}`)
            if (res.ok) {
                setCuisineData(await res.json())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setCuisineLoading(false)
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

    const profitBarData = [
        { name: "Bar", Revenu: data.bar.revenue, "Coût des ventes": data.bar.cogs, Bénéfice: data.bar.profit },
        { name: "Cuisine", Revenu: data.cuisine.revenue, "Coût des ventes": data.cuisine.cogs, Bénéfice: data.cuisine.profit },
    ]

    const formatCurrency = (val: number) =>
        val.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ` ${currencySymbol}`

    const handlePrintCuisine = () => {
        if (!cuisineData) return
        const period = `Période: ${format(dateFrom, "dd/MM/yyyy", { locale: fr })} — ${format(dateTo, "dd/MM/yyyy", { locale: fr })}`
        const origin = window.location.origin
        printReport({
            title: "Rapport Financier — Cuisine",
            subtitle: "Smart POS System — Analyse Cuisine",
            period,
            logoUrl: `${origin}/ahava.png`,
            metrics: [
                { label: "Chiffre d'Affaires", value: formatCurrency(cuisineData.summary.revenue), highlight: true },
                { label: "Coût des Ventes", value: formatCurrency(cuisineData.summary.cogs) },
                { label: "Bénéfice Brut", value: formatCurrency(cuisineData.summary.grossProfit), highlight: true },
                { label: "Marge", value: `${cuisineData.summary.margin.toFixed(1)}%` },
                { label: "Panier Moyen", value: formatCurrency(cuisineData.summary.averageOrderValue) },
                { label: "Transactions", value: String(cuisineData.summary.transactionCount) },
            ],
            columns: [
                { header: "Produit", key: "product" },
                { header: "Revenu", key: "revenue", format: "currency", align: "right" },
                { header: "Coût", key: "cogs", format: "currency", align: "right" },
                { header: "Bénéfice", key: "profit", format: "currency", align: "right" },
                { header: "Marge", key: "margin", align: "right" },
                { header: "Qté", key: "quantity", align: "right" },
            ],
            rows: (cuisineData.topSelling || []).slice(0, 20).map((p: any) => ({
                product: p.productName,
                revenue: p.revenue,
                cogs: p.cogs,
                profit: p.profit,
                margin: `${p.margin.toFixed(1)}%`,
                quantity: p.quantitySold,
            })),
        })
    }

    const handlePrintBar = () => {
        if (!barData) return
        const period = `Période: ${format(dateFrom, "dd/MM/yyyy", { locale: fr })} — ${format(dateTo, "dd/MM/yyyy", { locale: fr })}`
        const origin = window.location.origin
        printReport({
            title: "Rapport Financier — Bar",
            subtitle: "Smart POS System — Analyse Bar",
            period,
            logoUrl: `${origin}/ahava.png`,
            metrics: [
                { label: "Chiffre d'Affaires", value: formatCurrency(barData.summary.revenue), highlight: true },
                { label: "Coût des Ventes", value: formatCurrency(barData.summary.cogs) },
                { label: "Bénéfice Brut", value: formatCurrency(barData.summary.grossProfit), highlight: true },
                { label: "Marge", value: `${barData.summary.margin.toFixed(1)}%` },
                { label: "Panier Moyen", value: formatCurrency(barData.summary.averageOrderValue) },
                { label: "Transactions", value: String(barData.summary.transactionCount) },
            ],
            columns: [
                { header: "Produit", key: "product" },
                { header: "Revenu", key: "revenue", format: "currency", align: "right" },
                { header: "Coût", key: "cogs", format: "currency", align: "right" },
                { header: "Bénéfice", key: "profit", format: "currency", align: "right" },
                { header: "Marge", key: "margin", align: "right" },
                { header: "Qté", key: "quantity", align: "right" },
            ],
            rows: (barData.topSelling || []).slice(0, 20).map((p: any) => ({
                product: p.productName,
                revenue: p.revenue,
                cogs: p.cogs,
                profit: p.profit,
                margin: `${p.margin.toFixed(1)}%`,
                quantity: p.quantitySold,
            })),
        })
    }

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
                {
                    dept: "Bar",
                    revenue: data.bar.revenue,
                    cogs: data.bar.cogs,
                    profit: data.bar.profit,
                    margin: `${data.bar.margin.toFixed(1)}%`,
                    transactions: data.bar.transactionCount,
                },
                {
                    dept: "Cuisine",
                    revenue: data.cuisine.revenue,
                    cogs: data.cuisine.cogs,
                    profit: data.cuisine.profit,
                    margin: `${data.cuisine.margin.toFixed(1)}%`,
                    transactions: data.cuisine.transactionCount,
                },
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
                <Link href="/finance/cuisine" className="block">
                    <Card className="hover:bg-muted/50 transition-colors cursor-pointer border-amber-200 dark:border-amber-800">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Utensils className="h-6 w-6 text-amber-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold">Analyse Cuisine</h3>
                                <p className="text-sm text-muted-foreground">Ventes et rentabilité des produits alimentaires</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </CardContent>
                    </Card>
                </Link>
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
                    <TabsTrigger value="finance-bar">Finance Bar</TabsTrigger>
                    <TabsTrigger value="finance-cuisine">Finance Cuisine</TabsTrigger>
                    <TabsTrigger value="stock">Stock par Emplacement</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Bar vs Cuisine breakdown */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Beer className="h-5 w-5 text-blue-500" />
                                    <CardTitle className="text-lg">Bar</CardTitle>
                                </div>
                                <CardDescription>Boissons et produits servis au bar</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Revenu</p>
                                            <p className="text-xl font-bold text-green-600">{formatCurrency(data.bar.revenue)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Coût des ventes</p>
                                            <p className="text-xl font-bold text-red-500">{formatCurrency(data.bar.cogs)}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Bénéfice</p>
                                            <p className={`text-xl font-bold ${data.bar.profit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                                                {formatCurrency(data.bar.profit)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Marge</p>
                                            <p className="text-xl font-bold">{data.bar.margin.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t">
                                        <Badge variant="outline">{data.bar.transactionCount} transactions</Badge>
                                        <Badge variant="outline" className="bg-blue-500/10">
                                            Stock: {formatCurrency(data.bar.stockValue)}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Utensils className="h-5 w-5 text-amber-500" />
                                    <CardTitle className="text-lg">Cuisine</CardTitle>
                                </div>
                                <CardDescription>Plats préparés et ingrédients</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Revenu</p>
                                            <p className="text-xl font-bold text-green-600">{formatCurrency(data.cuisine.revenue)}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Coût des ventes</p>
                                            <p className="text-xl font-bold text-red-500">{formatCurrency(data.cuisine.cogs)}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Bénéfice</p>
                                            <p className={`text-xl font-bold ${data.cuisine.profit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                                                {formatCurrency(data.cuisine.profit)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground">Marge</p>
                                            <p className="text-xl font-bold">{data.cuisine.margin.toFixed(1)}%</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t">
                                        <Badge variant="outline">{data.cuisine.transactionCount} transactions</Badge>
                                        <Badge variant="outline" className="bg-amber-500/10">
                                            Stock: {formatCurrency(data.cuisine.stockValue)}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Profit Comparison Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Comparaison Bar vs Cuisine</CardTitle>
                            <CardDescription>Revenu, coût des ventes et bénéfice par département</CardDescription>
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
                                                {key === "bar" ? (
                                                    <Beer className="h-5 w-5 text-blue-500" />
                                                ) : key === "kitchen" ? (
                                                    <Utensils className="h-5 w-5 text-amber-500" />
                                                ) : key === "principal" ? (
                                                    <Warehouse className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <Store className="h-5 w-5 text-purple-500" />
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

                {/* Finance Bar tab */}
                <TabsContent value="finance-bar" className="space-y-4">
                    {barLoading || !barData ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-end">
                                <Button variant="default" onClick={handlePrintBar}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Imprimer
                                </Button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Chiffre d&apos;Affaires</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">{formatCurrency(barData.summary.revenue)}</div>
                                        <p className="text-xs text-muted-foreground">{barData.summary.transactionCount} transactions</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Coût des Ventes</CardTitle>
                                        <TrendingDown className="h-4 w-4 text-red-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-red-600">{formatCurrency(barData.summary.cogs)}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Bénéfice Brut</CardTitle>
                                        <DollarSign className="h-4 w-4 text-purple-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className={`text-2xl font-bold ${barData.summary.grossProfit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                                            {formatCurrency(barData.summary.grossProfit)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Marge {barData.summary.margin.toFixed(1)}%</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Panier Moyen</CardTitle>
                                        <ShoppingBag className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(barData.summary.averageOrderValue)}</div>
                                    </CardContent>
                                </Card>
                            </div>
                            {barData.categories.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Performance par Catégorie</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-3 px-2 font-medium">Catégorie</th>
                                                        <th className="text-right py-3 px-2 font-medium">Revenu</th>
                                                        <th className="text-right py-3 px-2 font-medium">Coût</th>
                                                        <th className="text-right py-3 px-2 font-medium">Bénéfice</th>
                                                        <th className="text-right py-3 px-2 font-medium">Marge</th>
                                                        <th className="text-right py-3 px-2 font-medium">Qté</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {barData.categories.map((cat: any) => (
                                                        <tr key={cat.categoryId} className="border-b hover:bg-muted/50">
                                                            <td className="py-3 px-2 font-medium">{cat.categoryName}</td>
                                                            <td className="text-right py-3 px-2 text-green-600">{formatCurrency(cat.revenue)}</td>
                                                            <td className="text-right py-3 px-2 text-red-500">{formatCurrency(cat.cogs)}</td>
                                                            <td className={`text-right py-3 px-2 font-medium ${cat.profit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                                                                {formatCurrency(cat.profit)}
                                                            </td>
                                                            <td className="text-right py-3 px-2">
                                                                <Badge variant={cat.margin >= 30 ? "default" : cat.margin >= 10 ? "secondary" : "destructive"} className="text-xs">
                                                                    {cat.margin.toFixed(1)}%
                                                                </Badge>
                                                            </td>
                                                            <td className="text-right py-3 px-2">{cat.quantity}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            {barData.topSelling.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Meilleurs Produits</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-3 px-2 font-medium">Produit</th>
                                                        <th className="text-right py-3 px-2 font-medium">Revenu</th>
                                                        <th className="text-right py-3 px-2 font-medium">Coût</th>
                                                        <th className="text-right py-3 px-2 font-medium">Bénéfice</th>
                                                        <th className="text-right py-3 px-2 font-medium">Marge</th>
                                                        <th className="text-right py-3 px-2 font-medium">Qté</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {barData.topSelling.slice(0, 10).map((product: any) => (
                                                        <tr key={product.productId} className="border-b hover:bg-muted/50">
                                                            <td className="py-3 px-2 font-medium">{product.productName}</td>
                                                            <td className="text-right py-3 px-2 text-green-600">{formatCurrency(product.revenue)}</td>
                                                            <td className="text-right py-3 px-2 text-red-500">{formatCurrency(product.cogs)}</td>
                                                            <td className={`text-right py-3 px-2 font-medium ${product.profit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                                                                {formatCurrency(product.profit)}
                                                            </td>
                                                            <td className="text-right py-3 px-2">
                                                                <Badge variant={product.margin >= 30 ? "default" : product.margin >= 10 ? "secondary" : "destructive"} className="text-xs">
                                                                    {product.margin.toFixed(1)}%
                                                                </Badge>
                                                            </td>
                                                            <td className="text-right py-3 px-2">{product.quantitySold}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </TabsContent>

                {/* Finance Cuisine tab */}
                <TabsContent value="finance-cuisine" className="space-y-4">
                    {cuisineLoading || !cuisineData ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-end">
                                <Button variant="default" onClick={handlePrintCuisine}>
                                    <Printer className="mr-2 h-4 w-4" />
                                    Imprimer
                                </Button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Chiffre d&apos;Affaires</CardTitle>
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">{formatCurrency(cuisineData.summary.revenue)}</div>
                                        <p className="text-xs text-muted-foreground">{cuisineData.summary.transactionCount} transactions</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Coût des Ventes</CardTitle>
                                        <TrendingDown className="h-4 w-4 text-red-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-red-600">{formatCurrency(cuisineData.summary.cogs)}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Bénéfice Brut</CardTitle>
                                        <DollarSign className="h-4 w-4 text-purple-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className={`text-2xl font-bold ${cuisineData.summary.grossProfit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                                            {formatCurrency(cuisineData.summary.grossProfit)}
                                        </div>
                                        <p className="text-xs text-muted-foreground">Marge {cuisineData.summary.margin.toFixed(1)}%</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Panier Moyen</CardTitle>
                                        <ShoppingBag className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(cuisineData.summary.averageOrderValue)}</div>
                                    </CardContent>
                                </Card>
                            </div>
                            {cuisineData.categories.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Performance par Catégorie</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-3 px-2 font-medium">Catégorie</th>
                                                        <th className="text-right py-3 px-2 font-medium">Revenu</th>
                                                        <th className="text-right py-3 px-2 font-medium">Coût</th>
                                                        <th className="text-right py-3 px-2 font-medium">Bénéfice</th>
                                                        <th className="text-right py-3 px-2 font-medium">Marge</th>
                                                        <th className="text-right py-3 px-2 font-medium">Qté</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {cuisineData.categories.map((cat: any) => (
                                                        <tr key={cat.categoryId} className="border-b hover:bg-muted/50">
                                                            <td className="py-3 px-2 font-medium">{cat.categoryName}</td>
                                                            <td className="text-right py-3 px-2 text-green-600">{formatCurrency(cat.revenue)}</td>
                                                            <td className="text-right py-3 px-2 text-red-500">{formatCurrency(cat.cogs)}</td>
                                                            <td className={`text-right py-3 px-2 font-medium ${cat.profit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                                                                {formatCurrency(cat.profit)}
                                                            </td>
                                                            <td className="text-right py-3 px-2">
                                                                <Badge variant={cat.margin >= 30 ? "default" : cat.margin >= 10 ? "secondary" : "destructive"} className="text-xs">
                                                                    {cat.margin.toFixed(1)}%
                                                                </Badge>
                                                            </td>
                                                            <td className="text-right py-3 px-2">{cat.quantity}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                            {cuisineData.topSelling.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Meilleurs Produits</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left py-3 px-2 font-medium">Produit</th>
                                                        <th className="text-right py-3 px-2 font-medium">Revenu</th>
                                                        <th className="text-right py-3 px-2 font-medium">Coût</th>
                                                        <th className="text-right py-3 px-2 font-medium">Bénéfice</th>
                                                        <th className="text-right py-3 px-2 font-medium">Marge</th>
                                                        <th className="text-right py-3 px-2 font-medium">Qté</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {cuisineData.topSelling.slice(0, 10).map((product: any) => (
                                                        <tr key={product.productId} className="border-b hover:bg-muted/50">
                                                            <td className="py-3 px-2 font-medium">{product.productName}</td>
                                                            <td className="text-right py-3 px-2 text-green-600">{formatCurrency(product.revenue)}</td>
                                                            <td className="text-right py-3 px-2 text-red-500">{formatCurrency(product.cogs)}</td>
                                                            <td className={`text-right py-3 px-2 font-medium ${product.profit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                                                                {formatCurrency(product.profit)}
                                                            </td>
                                                            <td className="text-right py-3 px-2">
                                                                <Badge variant={product.margin >= 30 ? "default" : product.margin >= 10 ? "secondary" : "destructive"} className="text-xs">
                                                                    {product.margin.toFixed(1)}%
                                                                </Badge>
                                                            </td>
                                                            <td className="text-right py-3 px-2">{product.quantitySold}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
