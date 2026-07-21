import { NextResponse } from "next/server"
import db from "@/lib/db"
import { stockTransfers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { approvedBy } = body

        if (!approvedBy) {
            return NextResponse.json({ error: "approvedBy is required" }, { status: 400 })
        }

        const [transfer] = await db
            .select()
            .from(stockTransfers)
            .where(eq(stockTransfers.id, id))

        if (!transfer) {
            return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
        }

        if (transfer.status !== "pending") {
            return NextResponse.json({ error: "Only pending transfers can be approved" }, { status: 400 })
        }

        const [updated] = await db
            .update(stockTransfers)
            .set({
                status: "approved",
                approvedBy,
                approvedAt: new Date(),
            })
            .where(eq(stockTransfers.id, id))
            .returning()

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error("Failed to approve transfer:", error)
        return NextResponse.json({ error: error.message || "Failed to approve transfer" }, { status: 500 })
    }
}
