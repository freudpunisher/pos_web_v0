import { NextResponse } from "next/server"
import db from "@/lib/db"
import { categories } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        const body = await request.json()
        const { name, description, groupId } = body

        const [updatedCategory] = await db
            .update(categories)
            .set({
                name,
                description,
                groupId: groupId || null,
            })
            .where(eq(categories.id, id))
            .returning()

        if (!updatedCategory) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }

        return NextResponse.json(updatedCategory)
    } catch (error) {
        console.error("Failed to update category:", error)
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        const [deletedCategory] = await db.delete(categories).where(eq(categories.id, id)).returning()

        if (!deletedCategory) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "Category deleted successfully" })
    } catch (error) {
        console.error("Failed to delete category:", error)
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 })
    }
}
