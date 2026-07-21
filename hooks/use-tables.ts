"use client"

import { useState, useEffect, useCallback } from "react"

export function useTables() {
    const [tables, setTables] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchTables = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/tables")
            if (res.ok) setTables(await res.json())
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchTables() }, [fetchTables])

    const createTable = async (data: any) => {
        const res = await fetch("/api/tables", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error("Failed to create table")
        const t = await res.json()
        setTables((prev) => [...prev, t])
        return t
    }

    const updateTable = async (id: string, data: any) => {
        const res = await fetch(`/api/tables/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error("Failed to update table")
        const updated = await res.json()
        setTables((prev) => prev.map((t) => (t.id === id ? updated : t)))
        return updated
    }

    const deleteTable = async (id: string) => {
        await fetch(`/api/tables/${id}`, { method: "DELETE" })
        setTables((prev) => prev.filter((t) => t.id !== id))
    }

    return { tables, loading, refresh: fetchTables, createTable, updateTable, deleteTable }
}
