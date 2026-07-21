"use client"

import { useState, useEffect, useCallback } from "react"

export function useNotifications() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchNotifications = useCallback(async () => {
        try {
            const res = await fetch("/api/notifications")
            if (res.ok) setNotifications(await res.json())
        } catch {} finally {
            setLoading(false)
        }
    }, [])

    const scanStock = useCallback(async () => {
        try {
            await fetch("/api/notifications", { method: "POST" })
            fetchNotifications()
        } catch {}
    }, [fetchNotifications])

    const markRead = useCallback(async (ids: string[]) => {
        await fetch("/api/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
        })
        setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n))
    }, [])

    const markAllRead = useCallback(async () => {
        await fetch("/api/notifications", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markAll: true }),
        })
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }, [])

    useEffect(() => { fetchNotifications() }, [fetchNotifications])

    return {
        notifications,
        loading,
        unreadCount: notifications.filter(n => !n.read).length,
        scanStock,
        markRead,
        markAllRead,
        refresh: fetchNotifications,
    }
}
