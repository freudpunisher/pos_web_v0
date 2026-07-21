"use client"

import { useCallback, useEffect, useState } from "react"

export interface CreditPaymentDTO {
  id: string
  amount: string
  date: string
  method: "cash" | "card"
  paymentRef?: string | null
}

export interface CreditRecordDTO {
  id: string
  clientId: string
  clientName?: string | null
  transactionId: string
  invoiceRef?: string | null
  reference?: string | null
  amount: string
  paidAmount: string
  dueDate: string
  status: "paid" | "partial" | "overdue" | "pending"
  payments: CreditPaymentDTO[]
}

export function useCredits(status?: string, sector?: string) {
  const [records, setRecords] = useState<CreditRecordDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCredits = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (status && status !== "all") params.set("status", status)
      if (sector) params.set("sector", sector)
      const response = await fetch(`/api/credits?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch credits")
      const data = await response.json()
      setRecords(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [status, sector])

  useEffect(() => {
    fetchCredits()
  }, [fetchCredits])

  const recordPayment = async (recordId: string, amount: number, method: "cash" | "card") => {
    try {
      const response = await fetch(`/api/credits/${recordId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, method }),
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Failed to record payment")
      }
      await fetchCredits()
    } catch (err: any) {
      setError(err.message)
      throw err
    }
  }

  return { records, loading, error, refresh: fetchCredits, recordPayment }
}
