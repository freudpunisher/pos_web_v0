"use client"

import { useState, useEffect, useCallback } from "react"

export function useLocations() {
    const [locations, setLocations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLocations = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/locations")
            if (res.ok) setLocations(await res.json())
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchLocations() }, [fetchLocations])

    const createLocation = async (data: any) => {
        const res = await fetch("/api/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error("Failed to create location")
        const loc = await res.json()
        setLocations((prev) => [...prev, loc])
        return loc
    }

    const updateLocation = async (id: string, data: any) => {
        const res = await fetch(`/api/locations/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error("Failed to update location")
        const updated = await res.json()
        setLocations((prev) => prev.map((l) => (l.id === id ? updated : l)))
        return updated
    }

    const deleteLocation = async (id: string) => {
        const res = await fetch(`/api/locations/${id}`, { method: "DELETE" })
        if (!res.ok) throw new Error("Failed to delete location")
        setLocations((prev) => prev.filter((l) => l.id !== id))
    }

    return { locations, loading, refresh: fetchLocations, createLocation, updateLocation, deleteLocation }
}
