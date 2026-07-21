"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TimePeriod = "today" | "week" | "month"

interface TimePeriodSelectorProps {
  selected: TimePeriod
  onSelect: (period: TimePeriod) => void
}

export function TimePeriodSelector({ selected, onSelect }: TimePeriodSelectorProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={selected === "today" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect("today")}
      >
        Today
      </Button>
      <Button
        variant={selected === "week" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect("week")}
      >
        This Week
      </Button>
      <Button
        variant={selected === "month" ? "default" : "outline"}
        size="sm"
        onClick={() => onSelect("month")}
      >
        This Month
      </Button>
    </div>
  )
}
