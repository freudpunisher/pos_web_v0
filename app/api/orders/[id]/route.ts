import { NextResponse } from "next/server"
import db from "@/lib/db"
import { transactions, transactionItems, tables as tablesSchema, products, stockMovements, stock, clients, creditRecords, creditPayments } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const order = await db.query.transactions.findFirst({
            where: eq(transactions.id, id),
            with: {
                items: true,
                client: true,
                user: true,
                waiter: { columns: { id: true, name: true } },
                table: { columns: { id: true, number: true, section: true } },
            },
        })

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 })
        }

        return NextResponse.json(order)
    } catch (error) {
        console.error("Failed to fetch order:", error)
        return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const body = await request.json()

        const [updated] = await db
            .update(transactions)
            .set(body)
            .where(eq(transactions.id, id))
            .returning()

        return NextResponse.json(updated)
    } catch (error) {
        console.error("Failed to update order:", error)
        return NextResponse.json({ error: "Failed to update order" }, { status: 500 })
    }
}
