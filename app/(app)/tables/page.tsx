"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function TablesPage() {
  const router = useRouter()
  useEffect(() => { router.replace("/locations") }, [router])
  return null
}
