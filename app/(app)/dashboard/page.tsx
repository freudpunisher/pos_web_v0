"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SalesChart } from "@/components/dashboard/sales-chart"
import { TimePeriodSelector, type TimePeriod } from "@/components/dashboard/time-period-selector"
import { formatCurrency } from "@/lib/mock-data"
import { useDashboardStats } from "@/hooks/use-dashboard-stats"
import { useTransactions } from "@/hooks/use-transactions"
import {
  DollarSign, TrendingUp, AlertTriangle,
  Loader2, RefreshCw, Receipt, Banknote, Clock,
  BarChart3, MapPin, Warehouse, Store,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useSettings } from "@/hooks/use-settings"
import { useLocations } from "@/hooks/use-locations"

export default function DashboardPage() {
  const { settings } = useSettings()
  const { locations } = useLocations()
  const { user } = useAuth()
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("today")
  const [locationFilter, setLocationFilter] = useState("all")
  const { stats, loading: statsLoading, error: statsError, refresh: refreshStats } = useDashboardStats(timePeriod)
  const { transactions, fetchTransactions, loading: txLoading } = useTransactions()
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true)
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  const [dashboardSector] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!autoRefreshEnabled) return
    const interval = setInterval(() => {
      refreshStats(timePeriod, dashboardSector, locationFilter)
      fetchTransactions()
    }, 30000)
    return () => clearInterval(interval)
  }, [autoRefreshEnabled, refreshStats, fetchTransactions, timePeriod, dashboardSector, locationFilter])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    await Promise.all([refreshStats(timePeriod, dashboardSector, locationFilter), fetchTransactions()])
    setIsManualRefreshing(false)
  }

  const handleLocationChange = (loc: string) => {
    setLocationFilter(loc)
    refreshStats(timePeriod, dashboardSector, loc)
  }

  const recentTransactions = transactions
    .filter((t: any) => t.type === "sale" && t.status !== "cancelled")
    .slice(0, 5)

  const currencySymbol = settings?.currencySymbol || "FC"

  const cashSalesCount = stats?.todayTransactionCount || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tableau de bord</h2>
          <p className="text-muted-foreground">Aperçu en temps réel de vos ventes en espèces</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <Select value={locationFilter} onValueChange={handleLocationChange}>
              <SelectTrigger className="w-44 h-9">
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
          <TimePeriodSelector selected={timePeriod} onSelect={setTimePeriod} />
          <div className="flex items-center gap-1.5 border-l pl-3 border-border">
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${autoRefreshEnabled ? "text-primary" : "text-muted-foreground"}`}
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              title={autoRefreshEnabled ? "Auto-actualisation activée" : "Auto-actualisation désactivée"}
            >
              <Clock className={`h-4 w-4 ${autoRefreshEnabled ? "animate-pulse" : ""}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing || statsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isManualRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {statsError && !statsLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Erreur de chargement : {statsError}</span>
          <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={handleManualRefresh}>Réessayer</Button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {timePeriod === "month" ? "Ventes mensuelles" : timePeriod === "week" ? "Ventes hebdomadaires" : "Ventes du jour"}
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {statsLoading ? <span className="text-muted-foreground animate-pulse">---</span> : formatCurrency(stats?.todaySales || 0)}
                </p>
                <p className="text-xs text-muted-foreground">{stats?.todayTransactionCount || 0} transactions</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {timePeriod === "month" ? "Revenus mensuels" : timePeriod === "week" ? "Revenus hebdomadaires" : "Revenus du jour"}
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {statsLoading ? <span className="text-muted-foreground animate-pulse">---</span> : formatCurrency(stats?.monthlyRevenue || 0, { symbol: currencySymbol })}
                </p>
                <p className="text-xs text-muted-foreground">Panier moyen : {formatCurrency((stats?.todaySales || 0) / Math.max(stats?.todayTransactionCount || 1, 1))}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ventes espèces</p>
                <p className="text-2xl font-bold tracking-tight">
                  {statsLoading ? <span className="text-muted-foreground animate-pulse">---</span> : cashSalesCount}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="border-green-500/30 text-green-700 text-[10px] px-1.5 font-normal">
                    <Banknote className="h-3 w-3 mr-0.5" />100% espèces
                  </Badge>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <Banknote className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock faible</p>
                <p className="text-2xl font-bold tracking-tight">
                  {statsLoading ? <span className="text-muted-foreground animate-pulse">---</span> : stats?.lowStockItems || 0}
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] px-1 py-0 font-normal">
                    {stats?.productsCount || 0} produits vendus
                  </Badge>
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart + Quick Stats Side by Side */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart loading={statsLoading} timePeriod={timePeriod} sector={dashboardSector} locationId={locationFilter} />
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Indicateurs de performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <MetricBar
              label="Produits vendus"
              value={stats?.productsCount || 0}
              suffix="articles"
              max={Math.max(stats?.productsCount || 0, 10)}
              loading={statsLoading}
              color="bg-primary"
            />
            <MetricBar
              label="Transactions"
              value={stats?.todayTransactionCount || 0}
              suffix="ventes"
              max={Math.max(stats?.todayTransactionCount || 1, 5)}
              loading={statsLoading}
              color="bg-green-500"
            />
            <MetricBar
              label="Panier moyen"
              value={formatCurrency(
                (stats?.todaySales || 0) / Math.max(stats?.todayTransactionCount || 1, 1)
              )}
              max={100}
              progress={Math.min(((stats?.todaySales || 0) / Math.max(stats?.todayTransactionCount || 1, 1)) / 100000 * 100, 100)}
              loading={statsLoading}
              color="bg-amber-500"
            />
            <MetricBar
              label="Ventes espèces"
              value={`100%`}
              max={100}
              loading={statsLoading}
              color="bg-emerald-500"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            Transactions récentes
          </CardTitle>
          <Badge variant="outline" className="text-xs font-normal">
            5 dernières
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Receipt className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-sm">Aucune transaction pour le moment</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentTransactions.map((txn: any) => (
                <div key={txn.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                      <Banknote className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {txn.client?.name || <span className="italic text-muted-foreground">Client libre</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono">#{txn.id.slice(0, 8)}</span>
                        <span className="mx-1">&middot;</span>
                        {new Date(txn.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {txn.user?.name && (
                          <><span className="mx-1">&middot;</span>{txn.user.name}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold">{formatCurrency(Number.parseFloat(txn.total))}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${txn.status === "completed"
                          ? "border-green-500/30 bg-green-500/10 text-green-700"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                        }`}
                    >
                      {txn.status === "completed" ? "Payé" : txn.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricBar({
  label, value, suffix, max, progress, loading, color,
}: {
  label: string
  value: string | number
  suffix?: string
  max?: number
  progress?: number
  loading?: boolean
  color: string
}) {
  const pct = progress ?? (typeof value === "number" && max ? Math.min((value / max) * 100, 100) : 0)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {loading ? <span className="text-muted-foreground animate-pulse">---</span> : value}
          {suffix && !loading && <span className="text-muted-foreground font-normal ml-0.5">{suffix}</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: loading ? "0%" : `${pct}%` }}
        />
      </div>
    </div>
  )
}
