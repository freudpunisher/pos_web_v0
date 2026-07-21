"use client"

import { useState, useEffect, useCallback } from "react"

export function useUsers() {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/users")
            if (!response.ok) throw new Error("Failed to fetch users")
            const data = await response.json()
            setUsers(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    const createUser = async (userData: any) => {
        try {
            const response = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            })
            if (!response.ok) throw new Error("Failed to create user")
            const newUser = await response.json()
            setUsers((prev) => [...prev, newUser])
            return newUser
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const updateUser = async (id: string, userData: any) => {
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(userData),
            })
            if (!response.ok) throw new Error("Failed to update user")
            const updated = await response.json()
            setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
            return updated
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    const deleteUser = async (id: string) => {
        try {
            const response = await fetch(`/api/users/${id}`, {
                method: "DELETE",
            })
            if (!response.ok) throw new Error("Failed to delete user")
            setUsers((prev) => prev.filter((u) => u.id !== id))
        } catch (err: any) {
            setError(err.message)
            throw err
        }
    }

    return { users, loading, error, refresh: fetchUsers, createUser, updateUser, deleteUser }
}
