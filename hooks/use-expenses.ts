"use client"

import { useState, useEffect, useCallback } from "react"
import type { Expense } from "@/lib/types"

export function useExpenses() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchExpenses = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/expenses")
            if (!response.ok) throw new Error("Failed to fetch expenses")
            const data = await response.json()
            setExpenses(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    const createExpense = async (expenseData: any) => {
        try {
            const response = await fetch("/api/expenses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(expenseData),
            })
            if (!response.ok) {
                const errData = await response.json()
                throw new Error(errData.error || "Failed to create expense")
            }
            const newExpense = await response.json()
            fetchExpenses()
            return newExpense
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const deleteExpense = async (id: string) => {
        try {
            const response = await fetch(`/api/expenses/${id}`, { method: "DELETE" })
            if (!response.ok) throw new Error("Failed to delete expense")
            fetchExpenses()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const validateExpense = async (id: string) => {
        try {
            const response = await fetch(`/api/expenses/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ _action: "validate" }),
            })
            if (!response.ok) throw new Error("Failed to validate expense")
            fetchExpenses()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateExpense = async (id: string, data: any) => {
        try {
            const response = await fetch(`/api/expenses/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            if (!response.ok) throw new Error("Failed to update expense")
            fetchExpenses()
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    useEffect(() => {
        fetchExpenses()
    }, [fetchExpenses])

    return { expenses, loading, error, refresh: fetchExpenses, createExpense, deleteExpense, validateExpense, updateExpense }
}
