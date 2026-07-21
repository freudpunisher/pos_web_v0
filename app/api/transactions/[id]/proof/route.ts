import { NextResponse } from "next/server"
import db from "@/lib/db"
import { transactions } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { clientProof } = body

        if (clientProof !== undefined && typeof clientProof !== "string") {
            return NextResponse.json({ error: "clientProof must be a string" }, { status: 400 })
        }

        const [existing] = await db
            .select()
            .from(transactions)
            .where(eq(transactions.id, id))

        if (!existing) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
        }

        const [updated] = await db
            .update(transactions)
            .set({ clientProof: clientProof || null })
            .where(eq(transactions.id, id))
            .returning()

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Failed to update proof:", error)
        return NextResponse.json({ error: "Failed to update proof" }, { status: 500 })
    }
}
