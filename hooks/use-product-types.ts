"use client"

import { useState, useEffect, useCallback } from "react"

export interface ProductType {
    id: string
    name: string
    slug: string
    icon: string | null
    color: string | null
    sortOrder: number | null
    isActive: boolean
}

export function useProductTypes() {
    const [types, setTypes] = useState<ProductType[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchTypes = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/product-types")
            if (!res.ok) throw new Error("Failed to fetch product types")
            const data = await res.json()
            setTypes(data)
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchTypes() }, [fetchTypes])

    const createType = async (data: Partial<ProductType>) => {
        const res = await fetch("/api/product-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to create product type")
        }
        const newType = await res.json()
        setTypes((prev) => [...prev, newType].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
        return newType
    }

    const updateType = async (id: string, data: Partial<ProductType>) => {
        const res = await fetch(`/api/product-types/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to update product type")
        }
        const updated = await res.json()
        setTypes((prev) => prev.map((t) => (t.id === id ? updated : t)))
        return updated
    }

    const deleteType = async (id: string) => {
        const res = await fetch(`/api/product-types/${id}`, { method: "DELETE" })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to delete product type")
        }
        setTypes((prev) => prev.filter((t) => t.id !== id))
    }

    const activeTypes = types.filter((t) => t.isActive)

    return { types, activeTypes, loading, error, createType, updateType, deleteType, refresh: fetchTypes }
}
