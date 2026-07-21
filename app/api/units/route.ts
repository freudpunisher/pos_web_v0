import { NextResponse } from "next/server"
import db from "@/lib/db"
import { measurementUnits } from "@/lib/db/schema"
import { asc } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"

export async function GET() {
  try {
    const units = await db
      .select({
        id: measurementUnits.id,
        code: measurementUnits.code,
        name: measurementUnits.name,
        symbol: measurementUnits.symbol,
        isActive: measurementUnits.isActive,
      })
      .from(measurementUnits)
      .orderBy(asc(measurementUnits.name))

    return NextResponse.json(units)
  } catch (error) {
    console.error("Failed to fetch units:", error)
    return NextResponse.json({ error: "Failed to fetch units" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const authError = await requireAdmin()
    if (authError) return authError

    const body = await request.json()
    const { code, name, symbol } = body

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 })
    }

    const [unit] = await db
      .insert(measurementUnits)
      .values({
        code: code.trim().toLowerCase(),
        name: name.trim(),
        symbol: symbol?.trim() || null,
      })
      .returning({
        id: measurementUnits.id,
        code: measurementUnits.code,
        name: measurementUnits.name,
        symbol: measurementUnits.symbol,
        isActive: measurementUnits.isActive,
      })

    return NextResponse.json(unit)
  } catch (error) {
    console.error("Failed to create unit:", error)
    return NextResponse.json({ error: "Failed to create unit" }, { status: 500 })
  }
}
