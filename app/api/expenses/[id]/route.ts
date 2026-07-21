import { NextResponse } from "next/server"
import db from "@/lib/db"
import { expenses } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        await db.delete(expenses).where(eq(expenses.id, id))
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to delete expense:", error)
        return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()

        if (body._action === "validate") {
            const [expense] = await db.update(expenses).set({
                validated: true,
            }).where(eq(expenses.id, id)).returning()
            return NextResponse.json(expense)
        }

        const { name, amount, category, description, date } = body
        const [expense] = await db.update(expenses).set({
            name,
            amount: amount?.toString(),
            category,
            description: description || null,
            date: date ? new Date(date) : undefined,
        }).where(eq(expenses.id, id)).returning()
        return NextResponse.json(expense)
    } catch (error) {
        console.error("Failed to update expense:", error)
        return NextResponse.json({ error: "Failed to update expense" }, { status: 500 })
    }
}
