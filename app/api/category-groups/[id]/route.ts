import { NextResponse } from "next/server"
import db from "@/lib/db"
import { categoryGroups, categories } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        const body = await request.json()
        const { name, description } = body

        const [updatedGroup] = await db
            .update(categoryGroups)
            .set({ name, description })
            .where(eq(categoryGroups.id, id))
            .returning()

        if (!updatedGroup) {
            return NextResponse.json({ error: "Category group not found" }, { status: 404 })
        }

        return NextResponse.json(updatedGroup)
    } catch (error) {
        console.error("Failed to update category group:", error)
        return NextResponse.json({ error: "Failed to update category group" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        const [deletedGroup] = await db.delete(categoryGroups).where(eq(categoryGroups.id, id)).returning()

        if (!deletedGroup) {
            return NextResponse.json({ error: "Category group not found" }, { status: 404 })
        }

        await db.update(categories).set({ groupId: null }).where(eq(categories.groupId, id))

        return NextResponse.json({ message: "Category group deleted successfully" })
    } catch (error) {
        console.error("Failed to delete category group:", error)
        return NextResponse.json({ error: "Failed to delete category group" }, { status: 500 })
    }
}
