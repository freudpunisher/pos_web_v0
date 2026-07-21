import { NextResponse } from "next/server"
import db from "@/lib/db"
import { transactions, creditRecords, clients, tables as tablesSchema } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()
        const { clientId } = body

        if (!clientId) {
            return NextResponse.json({ error: "clientId is required" }, { status: 400 })
        }

        const [existing] = await db
            .select()
            .from(transactions)
            .where(eq(transactions.id, id))

        if (!existing) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
        }

        if (existing.status === "completed" || existing.status === "cancelled") {
            return NextResponse.json({ error: "Cannot convert a completed or cancelled transaction" }, { status: 400 })
        }

        const [client] = await db
            .select()
            .from(clients)
            .where(eq(clients.id, clientId))

        if (!client) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 })
        }

        const total = Number.parseFloat(existing.total)
        const currentBalance = Number.parseFloat(client.creditBalance)
        const limit = Number.parseFloat(client.creditLimit)

        if (currentBalance + total > limit) {
            return NextResponse.json({
                error: `Limite de crédit dépassée. Disponible: ${(limit - currentBalance).toFixed(2)}`
            }, { status: 400 })
        }

        const result = await db.transaction(async (tx) => {
            const dueDate = new Date()
            dueDate.setDate(dueDate.getDate() + 30)

            // Update transaction
            const [updated] = await tx
                .update(transactions)
                .set({
                    status: "completed",
                    paymentMethod: "credit",
                    orderStatus: "paid",
                    clientId,
                })
                .where(eq(transactions.id, id))
                .returning()

            // Update client credit balance
            await tx
                .update(clients)
                .set({
                    creditBalance: sql`${clients.creditBalance} + ${total}`,
                })
                .where(eq(clients.id, clientId))

            // Create credit record
            await tx.insert(creditRecords).values({
                clientId,
                transactionId: id,
                amount: total.toString(),
                paidAmount: "0",
                dueDate,
                status: "pending",
            })

            // Free table if occupied
            if (existing.tableId) {
                await tx
                    .update(tablesSchema)
                    .set({ status: "free" })
                    .where(eq(tablesSchema.id, existing.tableId))
            }

            return updated
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to convert to credit:", error)
        return NextResponse.json({ error: "Failed to convert to credit" }, { status: 500 })
    }
}
