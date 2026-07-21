"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface SalesData {
  date: string
  sales: number
  transactions: number
}

interface SalesChartProps {
  loading?: boolean
  timePeriod?: "today" | "week" | "month"
  sector?: string
}

const CHART_TITLES: Record<string, string> = {
  today: "Today's Sales",
  week: "Sales Overview (Last 7 Days)",
  month: "Sales Overview (This Month)",
}

export function SalesChart({ loading = false, timePeriod = "week", sector }: SalesChartProps) {
  const [data, setData] = useState<SalesData[]>([])
  const [chartLoading, setChartLoading] = useState(true)

  useEffect(() => {
    fetchSalesData()
  }, [timePeriod, sector])

  const fetchSalesData = async () => {
    setChartLoading(true)
    try {
      const params = new URLSearchParams({ period: timePeriod })
      if (sector) {
        params.set("sector", sector)
      }
      const response = await fetch(`/api/dashboard/sales-chart?${params.toString()}`)
      if (response.ok) {
        const chartData = await response.json()
        setData(chartData)
      }
    } catch (error) {
      console.error("Failed to fetch sales chart data:", error)
    } finally {
      setChartLoading(false)
    }
  }

  if (chartLoading || loading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>{CHART_TITLES[timePeriod] || "Sales Overview"}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading chart...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>{CHART_TITLES[timePeriod] || "Sales Overview"}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-muted-foreground">No sales data available yet</p>
        </CardContent>
      </Card>
    )
  }

  const maxSales = Math.max(...data.map((d) => d.sales))
  const barHeight = maxSales > 0 ? 250 : 0

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle>{CHART_TITLES[timePeriod] || "Sales Overview"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] flex items-end justify-around gap-2 px-4 py-8">
          {data.map((item, index) => {
            const heightPercentage = maxSales > 0 ? (item.sales / maxSales) * barHeight : 0
            const dateObj = new Date(item.date)
            const dayName = dateObj.toLocaleDateString("en-US", { weekday: "short" })
            const dayNumber = dateObj.getDate()

            return (
              <div key={index} className="flex flex-col items-center gap-2 flex-1">
                <div className="h-[250px] w-full flex items-end justify-center">
                  <div
                    className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-lg transition-all hover:from-primary/80 hover:to-primary/40 cursor-pointer group relative"
                    style={{ height: `${heightPercentage}px` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      ${item.sales.toFixed(0)}
                    </div>
                  </div>
                </div>
                <div className="text-center text-xs text-muted-foreground">
                  <div className="font-semibold">{dayName}</div>
                  <div className="text-[10px]">{dayNumber}</div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
