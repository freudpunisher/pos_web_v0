import { NextResponse } from "next/server"
import db from "@/lib/db"
import { productTypes } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authError = await requireAdmin()
        if (authError) return authError

        const { id } = await params
        const body = await request.json()
        const { name, icon, color, sortOrder, isActive } = body

        const updates: Record<string, any> = {}
        if (name !== undefined) {
            const slug = name
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
            updates.name = name
            updates.slug = slug
        }
        if (icon !== undefined) updates.icon = icon
        if (color !== undefined) updates.color = color
        if (sortOrder !== undefined) updates.sortOrder = sortOrder
        if (isActive !== undefined) updates.isActive = isActive

        const [updated] = await db
            .update(productTypes)
            .set(updates)
            .where(eq(productTypes.id, id))
            .returning()

        if (!updated) {
            return NextResponse.json({ error: "Type not found" }, { status: 404 })
        }

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error("Failed to update product type:", error)
        return NextResponse.json({ error: "Failed to update product type" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const authError = await requireAdmin()
        if (authError) return authError

        const { id } = await params

        const [deleted] = await db
            .delete(productTypes)
            .where(eq(productTypes.id, id))
            .returning()

        if (!deleted) {
            return NextResponse.json({ error: "Type not found" }, { status: 404 })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete product type:", error)
        return NextResponse.json({ error: "Failed to delete product type" }, { status: 500 })
    }
}
