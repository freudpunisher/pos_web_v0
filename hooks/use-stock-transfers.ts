"use client"

import { useState, useEffect, useCallback } from "react"

export interface TransferItem {
    productId: string
    quantity: number
}

export function useStockTransfers() {
    const [transfers, setTransfers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchTransfers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/stock/transfers")
            if (res.ok) setTransfers(await res.json())
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchTransfers() }, [fetchTransfers])

    const createTransfer = async (data: {
        fromLocationId: string
        toLocationId: string
        userId: string
        notes?: string
        items: TransferItem[]
    }) => {
        const res = await fetch("/api/stock/transfers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to create transfer request")
        }
        const transfer = await res.json()
        setTransfers((prev) => [transfer, ...prev])
        return transfer
    }

    const approveTransfer = async (id: string, approvedBy: string) => {
        const res = await fetch(`/api/stock/transfers/${id}/approve`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ approvedBy }),
        })
        if (!res.ok) throw new Error("Failed to approve transfer")
        const updated = await res.json()
        setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)))
        return updated
    }

    const receiveTransfer = async (id: string, userId: string) => {
        const res = await fetch(`/api/stock/transfers/${id}/receive`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to receive transfer")
        }
        const updated = await res.json()
        setTransfers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)))
        return updated
    }

    const createDirectTransfer = async (data: {
        fromLocationId: string
        toLocationId: string
        userId: string
        notes?: string
        items: TransferItem[]
    }) => {
        const res = await fetch("/api/stock/transfers/direct", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to create direct transfer")
        }
        const transfer = await res.json()
        setTransfers((prev) => [transfer, ...prev])
        return transfer
    }

    return { transfers, loading, refresh: fetchTransfers, createTransfer, createDirectTransfer, approveTransfer, receiveTransfer }
}
