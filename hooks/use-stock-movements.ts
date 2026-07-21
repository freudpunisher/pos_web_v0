"use client"

import { useState, useCallback } from "react"

export function useStockMovements() {
    const [movements, setMovements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchMovements = useCallback(async (filters?: {
        dateFrom?: string
        dateTo?: string
        productId?: string
        locationId?: string
        type?: string
        search?: string
    }) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (filters?.dateFrom) params.append("dateFrom", filters.dateFrom)
            if (filters?.dateTo) params.append("dateTo", filters.dateTo)
            if (filters?.productId) params.append("productId", filters.productId)
            if (filters?.locationId) params.append("locationId", filters.locationId)
            if (filters?.type && filters.type !== "all") params.append("type", filters.type)
            if (filters?.search) params.append("search", filters.search)
            const url = `/api/stock-movements${params.toString() ? `?${params.toString()}` : ""}`
            const response = await fetch(url)
            if (!response.ok) throw new Error("Failed to fetch stock movements")
            const data = await response.json()
            setMovements(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    const createMovement = async (movementData: any) => {
        try {
            const response = await fetch("/api/stock-movements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(movementData),
            })
            if (!response.ok) throw new Error("Failed to create stock movement")
            const newMovement = await response.json()
            setMovements((prev) => [newMovement, ...prev])
            return newMovement
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    return { movements, loading, error, refresh: fetchMovements, createMovement }
}
