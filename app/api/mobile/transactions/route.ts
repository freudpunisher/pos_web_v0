import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import db from "@/lib/db"
import { transactions, transactionItems, products, stock, stockMovements, clients, locations, cashFlow, creditRecords } from "@/lib/db/schema"
import { eq, sql, and, max, gte, lte } from "drizzle-orm"

function fmt(date: Date) {
    const p = (n: number) => String(n).padStart(2, "0")
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

async function authenticate(request: Request) {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return null
    }
    const token = authHeader.substring(7)
    return await verifyToken(token)
}

// GET - fetch transactions for the authenticated user's location
export async function GET(request: NextRequest) {
    try {
        const payload = await authenticate(request)
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const searchParams = request.nextUrl.searchParams
        const dateFrom = searchParams.get("dateFrom")
        const dateTo = searchParams.get("dateTo")
        const locationId = searchParams.get("locationId")

        const conditions = []
        if (locationId) {
            conditions.push(eq(transactions.locationId, locationId))
        }
        if (dateFrom) {
            const d = new Date(dateFrom)
            d.setHours(0, 0, 0, 0)
            conditions.push(gte(transactions.date, sql`${fmt(d)}::timestamp`))
        }
        if (dateTo) {
            const d = new Date(dateTo)
            d.setHours(23, 59, 59, 999)
            conditions.push(lte(transactions.date, sql`${fmt(d)}::timestamp`))
        }

        const allTransactions = await db.query.transactions.findMany({
            where: conditions.length ? and(...conditions) : undefined,
            with: {
                items: true,
                client: true,
                user: true,
            },
            orderBy: (transactions, { desc }) => [desc(transactions.date)],
        })

        return NextResponse.json(allTransactions)
    } catch (error) {
        console.error("Mobile transactions fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
    }
}

// POST - create a single transaction (for online mobile sales)
export async function POST(request: Request) {
    try {
        const payload = await authenticate(request)
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { total, paymentMethod, clientId, items, locationId, reference, discount } = body

        if (!total || !paymentMethod || !items || items.length === 0) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        if (!["cash", "credit", "card"].includes(paymentMethod)) {
            return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
        }

        const userId = payload.userId

        const result = await db.transaction(async (tx) => {
            // Use mobile-generated reference or generate server-side
            let txReference = reference
            if (!txReference) {
                const now = new Date()
                const year = now.getFullYear()
                const month = String(now.getMonth() + 1).padStart(2, "0")
                const prefix = `FACT-${year}-${month}-`
                const [lastRef] = await tx
                    .select({ maxRef: max(transactions.reference) })
                    .from(transactions)
                    .where(sql`${transactions.reference} ~ ${`^FACT-${year}-${month}-[0-9]+$`}`)
                const lastNum = lastRef?.maxRef ? parseInt(lastRef.maxRef.split("-").pop()!, 10) : 0
                txReference = `${prefix}${String(lastNum + 1).padStart(5, "0")}`
            }

            // Create transaction
            const [newTransaction] = await tx
                .insert(transactions)
                .values({
                    type: "sale",
                    total: total.toString(),
                    status: "completed",
                    paymentMethod: paymentMethod,
                    clientId: clientId || null,
                    userId: userId,
                    locationId: locationId || null,
                    reference: txReference,
                    date: new Date(),
                })
                .returning()

            // Create cash flow entry for cash/card
            if (["cash", "card"].includes(paymentMethod)) {
                await tx.insert(cashFlow).values({
                    date: new Date(),
                    amount: total.toString(),
                    type: "inflow",
                    category: "sale",
                    description: `Mobile sale ${txReference} (${paymentMethod})`,
                    referenceId: newTransaction.id,
                    referenceType: "transaction",
                })
            }

            // Insert items and update stock
            for (const item of items) {
                const itemQuantity = Number(item.quantity)
                if (!Number.isFinite(itemQuantity) || itemQuantity <= 0) {
                    throw new Error("Invalid item quantity")
                }

                await tx.insert(transactionItems).values({
                    transactionId: newTransaction.id,
                    productId: item.productId,
                    productName: item.productName,
                    quantity: itemQuantity.toString(),
                    price: item.price.toString(),
                    discount: (item.discount || 0).toString(),
                })

                // Update product stock
                await tx
                    .update(products)
                    .set({ stock: sql`${products.stock} - ${itemQuantity}` })
                    .where(eq(products.id, item.productId))

                // Update per-location stock
                if (locationId) {
                    const [existingStock] = await tx
                        .select()
                        .from(stock)
                        .where(and(eq(stock.productId, item.productId), eq(stock.locationId, locationId)))
                        .limit(1)

                    if (existingStock) {
                        await tx
                            .update(stock)
                            .set({
                                quantityOnHand: sql`${stock.quantityOnHand} - ${itemQuantity}`,
                                updatedAt: new Date(),
                            })
                            .where(eq(stock.id, existingStock.id))
                    }
                }

                // Stock movement
                await tx.insert(stockMovements).values({
                    productId: item.productId,
                    productName: item.productName,
                    type: "out",
                    quantity: (-itemQuantity).toString(),
                    userId: userId,
                    locationId: locationId || null,
                    referenceId: newTransaction.id,
                    referenceType: "transaction",
                    notes: `Mobile sale ${newTransaction.id}`,
                })
            }

            // Handle credit
            if (clientId && paymentMethod === "credit") {
                await tx
                    .update(clients)
                    .set({ creditBalance: sql`${clients.creditBalance} + ${total}` })
                    .where(eq(clients.id, clientId))

                const dueDate = new Date()
                dueDate.setDate(dueDate.getDate() + 30)

                await tx.insert(creditRecords).values({
                    clientId: clientId,
                    transactionId: newTransaction.id,
                    amount: total.toString(),
                    paidAmount: "0",
                    dueDate,
                    status: "pending",
                })
            }

            return newTransaction
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Mobile transaction create error:", error)
        const errorMessage = error.message || "Failed to create transaction"
        return NextResponse.json({ error: errorMessage }, { status: error.message ? 400 : 500 })
    }
}
