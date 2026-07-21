import { NextResponse } from "next/server"
import db from "@/lib/db"
import { locations } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { name, type, isActive } = body

        const [updated] = await db
            .update(locations)
            .set({ name, type, isActive })
            .where(eq(locations.id, id))
            .returning()

        if (!updated) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 })
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Failed to update location:", error)
        return NextResponse.json({ error: "Failed to update location" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        await db.delete(locations).where(eq(locations.id, id))
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete location:", error)
        return NextResponse.json({ error: "Failed to delete location" }, { status: 500 })
    }
}
