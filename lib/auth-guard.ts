import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

export async function requireAuth() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value
  if (!token) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), payload: null }
  }

  const payload = await verifyToken(token)
  if (!payload) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), payload: null }
  }

  return { error: null, payload }
}

export async function requireAdmin() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await verifyToken(token)
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}

export async function requireStockManager() {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const payload = await verifyToken(token)
  if (!payload || (payload.role !== "admin" && payload.role !== "manager" && payload.role !== "stock_manager")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return null
}
