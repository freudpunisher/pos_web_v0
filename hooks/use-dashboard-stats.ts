"use client"

import { useState, useEffect, useCallback } from "react"

export function useDashboardStats(period: string = "today", sector?: string) {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchStats = useCallback(async (p: string = period, s: string | undefined = sector) => {
        setLoading(true)
        try {
            const url = new URL("/api/dashboard/stats", typeof window === "undefined" ? "http://localhost" : window.location.origin)
            url.searchParams.set("period", p)
            if (s) {
                url.searchParams.set("sector", s)
            }
            const response = await fetch(url.toString())
            if (!response.ok) throw new Error("Failed to fetch dashboard stats")
            const data = await response.json()
            setStats(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [period, sector])

    useEffect(() => {
        fetchStats(period, sector)
    }, [period, sector, fetchStats])

    return { stats, loading, error, refresh: fetchStats }
}
