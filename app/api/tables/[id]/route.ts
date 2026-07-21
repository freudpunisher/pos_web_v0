import { NextResponse } from "next/server"
import db from "@/lib/db"
import { tables } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { number, capacity, status, section } = body

        const [updated] = await db
            .update(tables)
            .set({ number, capacity, status, section })
            .where(eq(tables.id, id))
            .returning()

        if (!updated) {
            return NextResponse.json({ error: "Table not found" }, { status: 404 })
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Failed to update table:", error)
        return NextResponse.json({ error: "Failed to update table" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await db.delete(tables).where(eq(tables.id, id))
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete table:", error)
        return NextResponse.json({ error: "Failed to delete table" }, { status: 500 })
    }
}
