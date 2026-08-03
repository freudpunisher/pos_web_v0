import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import db from "@/lib/db"
import { transactions, transactionItems, products, stock, stockMovements, clients, cashFlow, creditRecords } from "@/lib/db/schema"
import { eq, sql, and } from "drizzle-orm"

async function authenticate(request: Request) {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return null
    }
    const token = authHeader.substring(7)
    return await verifyToken(token)
}

// POST - bulk sync offline sales from mobile
export async function POST(request: Request) {
    try {
        const payload = await authenticate(request)
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { sales } = body

        if (!sales || !Array.isArray(sales) || sales.length === 0) {
            return NextResponse.json({ error: "No sales provided" }, { status: 400 })
        }

        const userId = payload.userId
        const results: any[] = []
        const errors: any[] = []

        for (const saleData of sales) {
            try {
                const { total, paymentMethod, clientId, items, locationId, reference, discount } = saleData

                if (!total || !paymentMethod || !items || items.length === 0) {
                    errors.push({ reference, error: "Missing required fields" })
                    continue
                }

                const result = await db.transaction(async (tx) => {
                    // Generate reference: MOB- prefix for mobile-originated sales
                    let txReference = reference
                    if (!txReference) {
                        const now = new Date()
                        const year = now.getFullYear()
                        const month = String(now.getMonth() + 1).padStart(2, "0")
                        const prefix = `MOB-${year}-${month}-`
                        const [lastRef] = await tx
                            .select({ maxRef: max(transactions.reference) })
                            .from(transactions)
                            .where(sql`${transactions.reference} ~ ${`^MOB-${year}-${month}-[0-9]+$`}`)
                        const lastNum = lastRef?.maxRef ? parseInt(lastRef.maxRef.split("-").pop()!, 10) : 0
                        txReference = `${prefix}${String(lastNum + 1).padStart(5, "0")}`
                    }

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
                            date: saleData.dateVente ? new Date(saleData.dateVente) : new Date(),
                        })
                        .returning()

                    if (["cash", "card"].includes(paymentMethod)) {
                        await tx.insert(cashFlow).values({
                            date: new Date(),
                            amount: total.toString(),
                            type: "inflow",
                            category: "sale",
                            description: `Mobile bulk sale ${txReference}`,
                            referenceId: newTransaction.id,
                            referenceType: "transaction",
                        })
                    }

                    for (const item of items) {
                        const itemQuantity = Number(item.quantity)
                        if (!Number.isFinite(itemQuantity) || itemQuantity <= 0) {
                            throw new Error(`Invalid quantity for ${item.productName}`)
                        }

                        await tx.insert(transactionItems).values({
                            transactionId: newTransaction.id,
                            productId: item.productId,
                            productName: item.productName,
                            quantity: itemQuantity.toString(),
                            price: item.price.toString(),
                            discount: (item.discount || 0).toString(),
                        })

                        await tx
                            .update(products)
                            .set({ stock: sql`${products.stock} - ${itemQuantity}` })
                            .where(eq(products.id, item.productId))

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

                        await tx.insert(stockMovements).values({
                            productId: item.productId,
                            productName: item.productName,
                            type: "out",
                            quantity: (-itemQuantity).toString(),
                            userId: userId,
                            locationId: locationId || null,
                            referenceId: newTransaction.id,
                            referenceType: "transaction",
                            notes: `Mobile bulk sale ${newTransaction.id}`,
                        })
                    }

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

                results.push({ reference: txReference, id: result.id, success: true })
            } catch (error: any) {
                errors.push({ reference: saleData.reference, error: error.message })
            }
        }

        return NextResponse.json({
            synced: results.length,
            failed: errors.length,
            results,
            errors,
        })
    } catch (error: any) {
        console.error("Mobile bulk sync error:", error)
        return NextResponse.json(
            { error: error.message || "Bulk sync failed" },
            { status: 500 }
        )
    }
}
