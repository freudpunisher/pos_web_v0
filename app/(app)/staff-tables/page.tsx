"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function StaffTablesPage() {
  const router = useRouter()
  useEffect(() => { router.replace("/locations") }, [router])
  return null
}
