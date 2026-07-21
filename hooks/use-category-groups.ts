"use client"

import { useState, useEffect, useCallback } from "react"

export function useCategoryGroups() {
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchGroups = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/category-groups")
            if (!response.ok) throw new Error("Failed to fetch category groups")
            const data = await response.json()
            setGroups(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchGroups()
    }, [fetchGroups])

    const createGroup = async (groupData: any) => {
        try {
            const response = await fetch("/api/category-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(groupData),
            })
            if (!response.ok) throw new Error("Failed to create category group")
            const newGroup = await response.json()
            setGroups((prev) => [...prev, newGroup])
            return newGroup
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateGroup = async (id: string, groupData: any) => {
        try {
            const response = await fetch(`/api/category-groups/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(groupData),
            })
            if (!response.ok) throw new Error("Failed to update category group")
            const updated = await response.json()
            setGroups((prev) => prev.map((g) => (g.id === id ? updated : g)))
            return updated
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const deleteGroup = async (id: string) => {
        try {
            const response = await fetch(`/api/category-groups/${id}`, {
                method: "DELETE",
            })
            if (!response.ok) throw new Error("Failed to delete category group")
            setGroups((prev) => prev.filter((g) => g.id !== id))
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    return { groups, loading, error, refresh: fetchGroups, createGroup, updateGroup, deleteGroup }
}
