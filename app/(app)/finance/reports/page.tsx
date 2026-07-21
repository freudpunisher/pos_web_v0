"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useSettings } from "@/hooks/use-settings"

export default function ReportsPage() {
    const { settings } = useSettings()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    const currencySymbol = settings?.currencySymbol || "Fbu"

    useEffect(() => {
        fetchReport()
    }, [])

    const fetchReport = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/accounting")
            if (res.ok) {
                setData(await res.json())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || !data) {
        return <div className="p-8 text-center text-muted-foreground">Chargement des rapports...</div>
    }

    const { summary, details } = data

    // Mock chart data for now as the API returns aggregates
    // In a real app we'd fetch daily/monthly breakdown
    const chartData = [
        { name: 'Ventes', value: details.sales, fill: '#16a34a' },
        { name: 'Achats', value: details.purchases, fill: '#dc2626' },
        { name: 'Dépenses', value: details.operationalExpenses, fill: '#ea580c' },
    ]

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Rapports Financiers</h1>
                <p className="text-muted-foreground">Aperçu de la trésorerie et de la rentabilité.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Chiffre d'Affaires</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {summary.income.toLocaleString()} {currencySymbol}
                        </div>
                        <p className="text-xs text-muted-foreground">+ Ventes réalisées</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Charges Totales</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {summary.expenses.toLocaleString()} {currencySymbol}
                        </div>
                        <p className="text-xs text-muted-foreground">Achats + Dépenses Ops.</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Résultat Net</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-blue-600" : "text-destructive"}`}>
                            {summary.netProfit.toLocaleString()} {currencySymbol}
                        </div>
                        <p className="text-xs text-muted-foreground">Marge nette estimée</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Répartition Financière</CardTitle>
                        <CardDescription>Comparaison Entrées / Sorties sur la période.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value: number) => [`${value.toLocaleString()} ${currencySymbol}`, "Montant"]}
                                    />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Détails</CardTitle>
                        <CardDescription>Flux par catégorie</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center">
                                <span className="flex h-2 w-2 rounded-full bg-green-500 mr-2" />
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">Ventes Magasin</p>
                                    <p className="text-xs text-muted-foreground">Recettes encaissées</p>
                                </div>
                                <div className="font-medium">{details.sales.toLocaleString()}</div>
                            </div>
                            <div className="flex items-center">
                                <span className="flex h-2 w-2 rounded-full bg-red-500 mr-2" />
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">Achats Fournisseurs</p>
                                    <p className="text-xs text-muted-foreground">Commandes reçues</p>
                                </div>
                                <div className="font-medium">{details.purchases.toLocaleString()}</div>
                            </div>
                            <div className="flex items-center">
                                <span className="flex h-2 w-2 rounded-full bg-orange-500 mr-2" />
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">Dépenses Opérationnelles</p>
                                    <p className="text-xs text-muted-foreground">Loyer, électricité, etc.</p>
                                </div>
                                <div className="font-medium">{details.operationalExpenses.toLocaleString()}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
