"use client"

import { useState, useEffect, useCallback } from "react"

export function useUnits() {
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUnits = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/units")
      if (!response.ok) throw new Error("Failed to fetch units")
      const data = await response.json()
      setUnits(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUnits()
  }, [fetchUnits])

  const createUnit = async (unitData: any) => {
    try {
      const response = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitData),
      })
      if (!response.ok) throw new Error("Failed to create unit")
      const newUnit = await response.json()
      setUnits((prev) => [...prev, newUnit])
      return newUnit
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const deleteUnit = async (id: string) => {
    try {
      const response = await fetch(`/api/units/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete unit")
      setUnits((prev) => prev.filter((u) => u.id !== id))
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  const updateUnit = async (id: string, unitData: any) => {
    try {
      const response = await fetch(`/api/units/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unitData),
      })
      if (!response.ok) throw new Error("Failed to update unit")
      const updated = await response.json()
      setUnits((prev) => prev.map((u) => (u.id === id ? updated : u)))
      return updated
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  return { units, loading, error, refresh: fetchUnits, createUnit, deleteUnit, updateUnit }
}
