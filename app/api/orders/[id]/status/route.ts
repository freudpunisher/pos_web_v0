import { NextResponse } from "next/server"
import db from "@/lib/db"
import { transactions, clients, creditRecords } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

const validTransitions: Record<string, string[]> = {
    pending: ["confirmed", "completed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { orderStatus, paymentMethod, clientId } = body

        const [order] = await db
            .select()
            .from(transactions)
            .where(eq(transactions.id, id))
            .limit(1)

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }

        const allowed = validTransitions[order.orderStatus] || []
        if (orderStatus && !allowed.includes(orderStatus)) {
            return NextResponse.json(
                { error: `Cannot transition from ${order.orderStatus} to ${orderStatus}` },
                { status: 400 },
            )
        }

        const updateData: any = {}
        if (orderStatus) updateData.orderStatus = orderStatus

        if (orderStatus === "completed") {
            updateData.status = "completed"
            if (paymentMethod) updateData.paymentMethod = paymentMethod
            if (clientId) updateData.clientId = clientId
        }

        if (orderStatus === "cancelled") {
            updateData.status = "cancelled"
        }

        const [updated] = await db
            .update(transactions)
            .set(updateData)
            .where(eq(transactions.id, id))
            .returning()

        // Update client credit balance and create credit record for credit payments
        if (orderStatus === "completed" && paymentMethod === "credit" && clientId) {
            await db
                .update(clients)
                .set({
                    creditBalance: sql`${clients.creditBalance} + ${order.total}`,
                })
                .where(eq(clients.id, clientId))

            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + 30)

            await db.insert(creditRecords).values({
                clientId,
                transactionId: id,
                amount: order.total.toString(),
                paidAmount: "0",
                dueDate,
                status: "pending",
            })
        }

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Failed to update order status:", error)
        return NextResponse.json({ error: "Failed to update order status" }, { status: 500 })
    }
}
