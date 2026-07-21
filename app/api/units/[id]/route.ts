import { NextResponse } from "next/server"
import db from "@/lib/db"
import { measurementUnits } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAdmin()
    if (authError) return authError

    const { id } = await params
    const body = await request.json()
    const { code, name, symbol } = body

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 })
    }

    const [updated] = await db
      .update(measurementUnits)
      .set({
        code: code.trim().toLowerCase(),
        name: name.trim(),
        symbol: symbol?.trim() || null,
      })
      .where(eq(measurementUnits.id, id))
      .returning({
        id: measurementUnits.id,
        code: measurementUnits.code,
        name: measurementUnits.name,
        symbol: measurementUnits.symbol,
        isActive: measurementUnits.isActive,
      })

    if (!updated) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Failed to update unit:", error)
    return NextResponse.json({ error: "Failed to update unit" }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authError = await requireAdmin()
    if (authError) return authError

    const { id } = await params
    const [deleted] = await db.delete(measurementUnits).where(eq(measurementUnits.id, id)).returning()

    if (!deleted) {
      return NextResponse.json({ error: "Unit not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Unit deleted" })
  } catch (error) {
    console.error("Failed to delete unit:", error)
    return NextResponse.json({ error: "Failed to delete unit" }, { status: 500 })
  }
}
