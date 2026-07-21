"use client"

import { useState, useCallback } from "react"

export function usePurchaseOrders() {
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPurchaseOrders = useCallback(async (dateFrom?: string, dateTo?: string) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (dateFrom) params.append("dateFrom", dateFrom)
            if (dateTo) params.append("dateTo", dateTo)
            const url = `/api/purchase-orders${params.toString() ? `?${params.toString()}` : ""}`
            const response = await fetch(url)
            if (!response.ok) throw new Error("Failed to fetch purchase orders")
            const data = await response.json()
            setPurchaseOrders(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    return { purchaseOrders, loading, error, refresh: fetchPurchaseOrders }
}
