"use client"

import { useState, useEffect, useCallback } from "react"

export function useSettings() {
    const [settings, setSettings] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSettings = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/settings", { cache: "no-store", credentials: "same-origin" })
            if (!response.ok) {
                const errorBody = await response.json().catch(() => null)
                throw new Error(errorBody?.error || "Failed to fetch settings")
            }
            const data = await response.json()
            setSettings(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSettings()
    }, [fetchSettings])

    const updateSettings = async (data: any) => {
        try {
            const response = await fetch("/api/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            if (!response.ok) throw new Error("Failed to update settings")
            const updated = await response.json()
            setSettings(updated)
            return updated
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    return { settings, loading, error, refresh: fetchSettings, updateSettings }
}
