"use client"

import { useState, useEffect, useCallback } from "react"
import type { CaisseSession } from "@/lib/types"

export function useCaisse() {
    const [sessions, setSessions] = useState<CaisseSession[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSessions = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/caisse")
            if (!response.ok) throw new Error("Failed to fetch caisse sessions")
            const data = await response.json()
            setSessions(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSessions()
    }, [fetchSessions])

    const openSession = async (data: { userId: string; openingBalance?: number; notes?: string; locationId?: string }) => {
        try {
            const response = await fetch("/api/caisse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || "Failed to open session")
            }
            const session = await response.json()
            await fetchSessions()
            return session
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const closeSession = async (id: string, data: { closingBalance: number; notes?: string }) => {
        try {
            const response = await fetch(`/api/caisse/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "close", ...data }),
            })
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || "Failed to close session")
            }
            const session = await response.json()
            await fetchSessions()
            return session
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const addMovement = async (sessionId: string, data: { type: "in" | "out"; amount: number; reason: string }) => {
        try {
            const response = await fetch(`/api/caisse/${sessionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "movement", ...data }),
            })
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.error || "Failed to record movement")
            }
            const movement = await response.json()
            await fetchSessions()
            return movement
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const getSessionDetails = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/caisse/${id}`)
            if (!response.ok) throw new Error("Failed to fetch session details")
            return await response.json()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }, [])

    const openSession_ = sessions.find((s) => s.status === "open")

    return {
        sessions,
        openSession: openSession_,
        loading,
        error,
        refresh: fetchSessions,
        openSessionAction: openSession,
        closeSession,
        addMovement,
        getSessionDetails,
    }
}
