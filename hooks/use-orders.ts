"use client"

import { useState, useEffect, useCallback } from "react"

export function useOrders() {
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchOrders = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/orders")
            if (res.ok) setOrders(await res.json())
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchOrders() }, [fetchOrders])

    const createOrder = async (data: any) => {
        const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Failed to create order" }))
            throw new Error(err.error || "Failed to create order")
        }
        const order = await res.json()
        setOrders((prev) => [order, ...prev])
        return order
    }

    const updateOrderStatus = async (id: string, data: any) => {
        const res = await fetch(`/api/orders/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error("Failed to update order status")
        const updated = await res.json()
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)))
        return updated
    }

    const updateOrder = async (id: string, data: any) => {
        const res = await fetch(`/api/orders/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error("Failed to update order")
        const updated = await res.json()
        setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)))
        return updated
    }

    return { orders, loading, refresh: fetchOrders, createOrder, updateOrderStatus, updateOrder }
}
