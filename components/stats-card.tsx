import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    positive: boolean
  }
  variant?: "default" | "success" | "warning" | "destructive"
}

export function StatsCard({ title, value, description, icon: Icon, trend, variant = "default" }: StatsCardProps) {
  const iconColors = {
    default: "bg-primary/20 text-primary",
    success: "bg-accent/20 text-accent",
    warning: "bg-warning/20 text-warning",
    destructive: "bg-destructive/20 text-destructive",
  }

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {trend && (
              <p className={cn("text-xs font-medium", trend.positive ? "text-accent" : "text-destructive")}>
                {trend.positive ? "+" : "-"}
                {Math.abs(trend.value)}% par rapport à la période précédente
              </p>
            )}
          </div>
          <div className={cn("rounded-lg p-3", iconColors[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
