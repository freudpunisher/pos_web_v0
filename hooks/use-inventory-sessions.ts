"use client"

import { useState, useEffect, useCallback } from "react"

export function useInventorySessions() {
    const [sessions, setSessions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSessions = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/inventory-sessions")
            if (!response.ok) throw new Error("Failed to fetch sessions")
            const data = await response.json()
            setSessions(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    const startSession = async (sessionData: any) => {
        try {
            const response = await fetch("/api/inventory-sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sessionData),
            })
            if (!response.ok) {
                const data = await response.json().catch(() => ({}))
                throw new Error(data?.error || "Failed to start session")
            }
            const newSession = await response.json()
            setSessions((prev) => [newSession, ...prev])
            return newSession
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const getSession = async (id: string) => {
        try {
            const response = await fetch(`/api/inventory-sessions/${id}`)
            if (!response.ok) throw new Error("Failed to fetch session")
            return await response.json()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateSessionItems = async (id: string, items: any[]) => {
        try {
            const response = await fetch(`/api/inventory-sessions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ items }),
            })
            if (!response.ok) throw new Error("Failed to update items")
            return await response.json()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const reconcileSession = async (id: string) => {
        try {
            const response = await fetch(`/api/inventory-sessions/${id}/reconcile`, {
                method: "POST",
            })
            if (!response.ok) throw new Error("Failed to reconcile session")
            const updated = await response.json()
            setSessions((prev) => prev.map(s => s.id === id ? updated : s))
            return updated
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const addItemToSession = async (id: string, productId: string) => {
        try {
            const response = await fetch(`/api/inventory-sessions/${id}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId }),
            })
            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || "Failed to add item")
            }
            return await response.json()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    return {
        sessions,
        loading,
        error,
        refresh: fetchSessions,
        startSession,
        getSession,
        updateSessionItems,
        reconcileSession,
        addItemToSession
    }
}
