"use client"

import { useState, useCallback } from "react"

export function useTransactions(sector?: string) {
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchTransactions = useCallback(async (dateFrom?: string, dateTo?: string) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (dateFrom) params.append("dateFrom", dateFrom)
            if (dateTo) params.append("dateTo", dateTo)
            const url = `/api/transactions${params.toString() ? `?${params.toString()}` : ""}`
            const response = await fetch(url)
            if (!response.ok) throw new Error("Failed to fetch transactions")
            const data = await response.json()
            setTransactions(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [sector])

    const processTransaction = useCallback(async (transactionData: any) => {
        setLoading(true)
        try {
            const response = await fetch("/api/transactions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(transactionData),
            })
            if (!response.ok) throw new Error("Failed to process transaction")
            const data = await response.json()
            return data
        } catch (err: any) {
            setError(err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }, [])

    const updateTransaction = useCallback(async (id: string, data: any) => {
        setLoading(true)
        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || "Failed to update transaction")
            }
            const result = await response.json()
            setTransactions((prev) => prev.map((t: any) => (t.id === id ? result : t)))
            return result
        } catch (err: any) {
            setError(err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }, [])

    const cancelTransaction = useCallback(async (id: string, cancelReason?: string) => {
        setLoading(true)
        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel", cancelReason }),
            })
            if (!response.ok) {
                const err = await response.json()
                throw new Error(err.error || "Failed to cancel transaction")
            }
            const updated = await response.json()
            setTransactions((prev) => prev.map((t: any) => (t.id === id ? updated : t)))
        } catch (err: any) {
            setError(err.message)
            throw err
        } finally {
            setLoading(false)
        }
    }, [])

    return { transactions, processTransaction, fetchTransactions, updateTransaction, cancelTransaction, loading, error }
}
