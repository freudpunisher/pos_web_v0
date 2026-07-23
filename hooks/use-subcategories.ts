"use client"

import { useState, useEffect, useCallback } from "react"

export interface Subcategory {
    id: string
    productTypeId: string
    name: string
    slug: string
    icon: string | null
    color: string | null
    sortOrder: number | null
    isActive: boolean
}

export function useSubcategories(productTypeId?: string | null) {
    const [subcategories, setSubcategories] = useState<Subcategory[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSubcategories = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (productTypeId) params.set("productTypeId", productTypeId)
            const res = await fetch(`/api/subcategories?${params.toString()}`)
            if (!res.ok) throw new Error("Failed to fetch subcategories")
            const data = await res.json()
            setSubcategories(data)
            setError(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [productTypeId])

    useEffect(() => { fetchSubcategories() }, [fetchSubcategories])

    const createSubcategory = async (data: Partial<Subcategory>) => {
        const res = await fetch("/api/subcategories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to create subcategory")
        }
        const newSub = await res.json()
        setSubcategories((prev) => [...prev, newSub].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)))
        return newSub
    }

    const updateSubcategory = async (id: string, data: Partial<Subcategory>) => {
        const res = await fetch(`/api/subcategories/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to update subcategory")
        }
        const updated = await res.json()
        setSubcategories((prev) => prev.map((s) => (s.id === id ? updated : s)))
        return updated
    }

    const deleteSubcategory = async (id: string) => {
        const res = await fetch(`/api/subcategories/${id}`, { method: "DELETE" })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to delete subcategory")
        }
        setSubcategories((prev) => prev.filter((s) => s.id !== id))
    }

    const activeSubcategories = subcategories.filter((s) => s.isActive)

    return { subcategories, activeSubcategories, loading, error, createSubcategory, updateSubcategory, deleteSubcategory, refresh: fetchSubcategories }
}
