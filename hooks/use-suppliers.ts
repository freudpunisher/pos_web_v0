"use client"

import { useState, useEffect, useCallback } from "react"

export function useSuppliers() {
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchSuppliers = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/suppliers")
            if (!response.ok) throw new Error("Failed to fetch suppliers")
            const data = await response.json()
            setSuppliers(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSuppliers()
    }, [fetchSuppliers])

    const createSupplier = async (supplierData: any) => {
        try {
            const response = await fetch("/api/suppliers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(supplierData),
            })
            if (!response.ok) throw new Error("Failed to create supplier")
            const newSupplier = await response.json()
            setSuppliers((prev) => [newSupplier, ...prev])
            return newSupplier
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateSupplier = async (id: string, supplierData: any) => {
        try {
            const response = await fetch(`/api/suppliers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(supplierData),
            })
            if (!response.ok) throw new Error("Failed to update supplier")
            const updated = await response.json()
            setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)))
            return updated
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const toggleSupplierStatus = async (id: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/suppliers/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive }),
            })
            if (!response.ok) throw new Error("Failed to update supplier status")
            const updated = await response.json()
            setSuppliers((prev) => prev.map((s) => (s.id === id ? updated : s)))
            return updated
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    return { suppliers, loading, error, refresh: fetchSuppliers, createSupplier, updateSupplier, toggleSupplierStatus }
}
