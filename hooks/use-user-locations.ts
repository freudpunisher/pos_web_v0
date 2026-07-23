"use client"

import { useState, useEffect, useCallback } from "react"

export interface UserLocation {
    id: string
    userId: string
    locationId: string
    location?: {
        id: string
        name: string
        type: string
    }
}

export function useUserLocations(userId?: string) {
    const [userLocations, setUserLocations] = useState<UserLocation[]>([])
    const [loading, setLoading] = useState(false)

    const fetchUserLocations = useCallback(async () => {
        if (!userId) return
        setLoading(true)
        try {
            const res = await fetch(`/api/users/${userId}/locations`)
            if (res.ok) {
                setUserLocations(await res.json())
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchUserLocations()
    }, [fetchUserLocations])

    const assignLocationToUser = async (locationId: string) => {
        if (!userId) return
        const res = await fetch(`/api/users/${userId}/locations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locationId }),
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to assign location")
        }
        const newAssignment = await res.json()
        setUserLocations([newAssignment])
        return newAssignment
    }

    const removeLocationFromUser = async (locationId: string) => {
        if (!userId) return
        const res = await fetch(`/api/users/${userId}/locations/${locationId}`, {
            method: "DELETE",
        })
        if (!res.ok) {
            const err = await res.json()
            throw new Error(err.error || "Failed to remove location")
        }
        setUserLocations((prev) => prev.filter((ul) => ul.locationId !== locationId))
    }

    return {
        userLocations,
        loading,
        refresh: fetchUserLocations,
        assignLocationToUser,
        removeLocationFromUser,
    }
}
