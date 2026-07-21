"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts"
import {
    Loader2, TrendingUp, TrendingDown, DollarSign, Utensils,
    CalendarIcon, ShoppingBag, Award, PieChart as PieChartIcon,
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useSettings } from "@/hooks/use-settings"

const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

export default function CuisineFinancePage() {
    const { settings } = useSettings()
    const today = new Date()
    const [dateFrom, setDateFrom] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1))
    const [dateTo, setDateTo] = useState<Date>(today)
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const currencySymbol = settings?.currencySymbol || "Fbu"

    const fetchData = async (from?: Date, to?: Date) => {
        setLoading(true)
        try {
            const start = from || dateFrom
            const end = to || dateTo
            const params = new URLSearchParams({
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            })
            const res = await fetch(`/api/finance/cuisine?${params}`)
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
    }, [])

    const handleDateFilter = (from: Date, to: Date) => {
        setDateFrom(from)
        setDateTo(to)
        fetchData(from, to)
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
                    <p className="text-muted-foreground">Chargement des données cuisine...</p>
                </div>
            </div>
        )
    }

    const formatCurrency = (val: number) =>
        val.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ` ${currencySymbol}`

    const { summary, categories, topSelling, trend, paymentMethods } = data

    const categoryPieData = categories.map((c: any) => ({
        name: c.categoryName,
        value: c.revenue,
    }))

    const paymentPieData = paymentMethods.map((p: any) => ({
        name: p.method === "cash" ? "Espèces" : p.method === "card" ? "Carte" : "Crédit",
        value: p.total,
    }))

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cuisine — Performance Financière</h1>
                    <p className="text-muted-foreground">Analyse détaillée des ventes et de la rentabilité des produits alimentaires</p>
                </div>
                <Button variant="outline" onClick={() => fetchData()}>
                    <Loader2 className="mr-2 h-4 w-4" />
                    Actualiser
                </Button>
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
                        <CardTitle className="text-sm font-medium">Chiffre d&apos;Affaires</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.revenue)}</div>
                        <p className="text-xs text-muted-foreground">{summary.transactionCount} transactions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Coût des Ventes</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.cogs)}</div>
                        <p className="text-xs text-muted-foreground">{summary.totalQuantity} unités vendues</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Bénéfice Brut</CardTitle>
                        <DollarSign className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.grossProfit >= 0 ? "text-purple-600" : "text-destructive"}`}>
                            {formatCurrency(summary.grossProfit)}
                        </div>
                        <p className="text-xs text-muted-foreground">Marge {summary.margin.toFixed(1)}%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Panier Moyen</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.averageOrderValue)}</div>
                        <p className="text-xs text-muted-foreground">Valeur moyenne par transaction</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
                    <TabsTrigger value="products">Meilleurs Produits</TabsTrigger>
                    <TabsTrigger value="trend">Tendances</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Revenue & Profit Trend */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Évolution du Chiffre d&apos;Affaires et Bénéfice</CardTitle>
                                <CardDescription>Revenu quotidien vs coût des ventes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={trend}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "dd/MM")} />
                                            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip formatter={(value: number) => [formatCurrency(value)]} labelFormatter={(d) => format(new Date(d), "dd/MM/yyyy")} />
                                            <Legend />
                                            <Area type="monotone" dataKey="revenue" name="Revenu" stroke="#10b981" fill="url(#colorRevenue)" strokeWidth={2} />
                                            <Area type="monotone" dataKey="profit" name="Bénéfice" stroke="#8b5cf6" fill="url(#colorProfit)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Category Breakdown Pie */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Répartition par Catégorie</CardTitle>
                                <CardDescription>Chiffre d&apos;affaires par catégorie de produit</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] flex items-center justify-center">
                                    {categoryPieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={categoryPieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {categoryPieData.map((_: any, idx: number) => (
                                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-muted-foreground">Aucune donnée</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Methods */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Moyens de Paiement</CardTitle>
                                <CardDescription>Répartition des ventes par méthode de paiement</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] flex items-center justify-center">
                                    {paymentPieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={paymentPieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {paymentPieData.map((_: any, idx: number) => (
                                                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <p className="text-muted-foreground">Aucune donnée</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Category Profit Table */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Performance par Catégorie</CardTitle>
                                <CardDescription>Revenu, coût et marge par catégorie alimentaire</CardDescription>
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
                                                <th className="text-right py-3 px-2 font-medium">Transactions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categories.map((cat: any) => (
                                                <tr key={cat.categoryId} className="border-b hover:bg-muted/50 transition-colors">
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
                                                    <td className="text-right py-3 px-2">{cat.transactionCount}</td>
                                                </tr>
                                            ))}
                                            {categories.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                                                        Aucune vente de produits alimentaires sur cette période
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="products" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Meilleurs Produits Alimentaires</CardTitle>
                            <CardDescription>Top 20 des produits les plus performants</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-2 font-medium">#</th>
                                            <th className="text-left py-3 px-2 font-medium">Produit</th>
                                            <th className="text-right py-3 px-2 font-medium">Prix vente</th>
                                            <th className="text-right py-3 px-2 font-medium">Prix revient</th>
                                            <th className="text-right py-3 px-2 font-medium">Qté vendue</th>
                                            <th className="text-right py-3 px-2 font-medium">Revenu</th>
                                            <th className="text-right py-3 px-2 font-medium">Coût</th>
                                            <th className="text-right py-3 px-2 font-medium">Bénéfice</th>
                                            <th className="text-right py-3 px-2 font-medium">Marge</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topSelling.map((product: any, idx: number) => (
                                            <tr key={product.productId} className="border-b hover:bg-muted/50 transition-colors">
                                                <td className="py-3 px-2">
                                                    <div className="flex items-center gap-2">
                                                        {idx < 3 ? (
                                                            <Award className={`h-4 w-4 ${idx === 0 ? "text-yellow-500" : idx === 1 ? "text-gray-400" : "text-amber-600"}`} />
                                                        ) : (
                                                            <span className="text-muted-foreground">{idx + 1}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-2 font-medium">{product.productName}</td>
                                                <td className="text-right py-3 px-2">{formatCurrency(product.unitPrice)}</td>
                                                <td className="text-right py-3 px-2">{formatCurrency(product.costPrice)}</td>
                                                <td className="text-right py-3 px-2">{product.quantitySold}</td>
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
                                            </tr>
                                        ))}
                                        {topSelling.length === 0 && (
                                            <tr>
                                                <td colSpan={9} className="text-center py-8 text-muted-foreground">
                                                    Aucune vente de produits alimentaires sur cette période
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Products Bar Chart */}
                    {topSelling.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Top Produits — Revenu vs Bénéfice</CardTitle>
                                <CardDescription>Comparaison des 10 meilleurs produits</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={topSelling.slice(0, 10)}
                                            layout="vertical"
                                            margin={{ left: 120 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                            <YAxis type="category" dataKey="productName" width={110} tick={{ fontSize: 12 }} />
                                            <Tooltip formatter={(value: number) => [formatCurrency(value)]} />
                                            <Legend />
                                            <Bar dataKey="revenue" name="Revenu" fill="#10b981" radius={[0, 4, 4, 0]} />
                                            <Bar dataKey="profit" name="Bénéfice" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="trend" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Daily Revenue Line */}
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <CardTitle>Tendance Quotidienne</CardTitle>
                                <CardDescription>Revenu, coût et bénéfice par jour</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[350px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trend}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "dd/MM")} />
                                            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip formatter={(value: number) => [formatCurrency(value)]} labelFormatter={(d) => format(new Date(d), "dd/MM/yyyy")} />
                                            <Legend />
                                            <Line type="monotone" dataKey="revenue" name="Revenu" stroke="#10b981" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="cogs" name="Coût des ventes" stroke="#ef4444" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="profit" name="Bénéfice" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Transactions per day */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Transactions par Jour</CardTitle>
                                <CardDescription>Nombre de transactions cuisine quotidiennes</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={trend}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "dd/MM")} />
                                            <YAxis allowDecimals={false} />
                                            <Tooltip labelFormatter={(d) => format(new Date(d), "dd/MM/yyyy")} />
                                            <Bar dataKey="transactions" name="Transactions" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Daily profit margin */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Marge Bénéficiaire Quotidienne</CardTitle>
                                <CardDescription>Évolution du taux de marge jour par jour</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={trend.map((d: any) => ({
                                                ...d,
                                                margin: d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0,
                                            }))}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "dd/MM")} />
                                            <YAxis tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 100]} />
                                            <Tooltip
                                                formatter={(value: number) => [`${value.toFixed(1)}%`, "Marge"]}
                                                labelFormatter={(d) => format(new Date(d), "dd/MM/yyyy")}
                                            />
                                            <Line type="monotone" dataKey="margin" name="Marge" stroke="#f59e0b" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
