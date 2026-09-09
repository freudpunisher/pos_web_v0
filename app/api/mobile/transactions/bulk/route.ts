import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import db from "@/lib/db"
import { transactions, transactionItems, products, stock, stockMovements, clients, locations, cashFlow, creditRecords, productSellingUnits } from "@/lib/db/schema"
import { eq, sql, and, max } from "drizzle-orm"

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
        // Offline sales sync is reserved for cashiers
        if (payload.role !== "cashier") {
            return NextResponse.json(
                { error: "Forbidden: offline sales sync requires cashier role" },
                { status: 403 }
            )
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

                // Reference stays in the outer scope so it can be used for the result below
                let txReference: string | null = reference

                const result = await db.transaction(async (tx) => {
                    // Generate reference: MOB- prefix for mobile-originated sales
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

                    // Idempotency: skip a sale that was already synced (retry after partial failure)
                    const [existingTx] = await tx
                        .select({ id: transactions.id })
                        .from(transactions)
                        .where(eq(transactions.reference, txReference))
                        .limit(1)
                    if (existingTx) {
                        return { id: existingTx.id, reference: txReference, success: true, skipped: true }
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

                        // Resolve selling unit conversion factor (defaults to base unit = 1)
                        let conversionFactor = 1
                        if (item.sellingUnitId) {
                            const [su] = await tx
                                .select({ conversionFactor: productSellingUnits.conversionFactor })
                                .from(productSellingUnits)
                                .where(and(eq(productSellingUnits.id, item.sellingUnitId), eq(productSellingUnits.productId, item.productId)))
                                .limit(1)
                            if (su) {
                                conversionFactor = Number(su.conversionFactor)
                            }
                        }
                        const stockQty = itemQuantity * conversionFactor

                        // Resolve target location (sale locationId or first active location)
                        let targetLocation
                        if (locationId) {
                            const [loc] = await tx.select().from(locations).where(eq(locations.id, locationId)).limit(1)
                            targetLocation = loc
                        }
                        if (!targetLocation) {
                            const [defaultLoc] = await tx.select().from(locations).where(eq(locations.isActive, true)).limit(1)
                            targetLocation = defaultLoc
                        }

                        // Stock sufficiency check in base units
                        if (targetLocation) {
                            let available = Number((await tx
                                .select({ quantityOnHand: stock.quantityOnHand })
                                .from(stock)
                                .where(and(eq(stock.productId, item.productId), eq(stock.locationId, targetLocation.id)))
                                .limit(1))?.[0]?.quantityOnHand ?? 0)
                            if (available < stockQty) {
                                throw new Error(`Stock insuffisant pour ${item.productName}. Disponible: ${available}, requis: ${stockQty}`)
                            }
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
                            .set({ stock: sql`${products.stock} - ${stockQty}` })
                            .where(eq(products.id, item.productId))

                        if (targetLocation) {
                            const [existingStock] = await tx
                                .select()
                                .from(stock)
                                .where(and(eq(stock.productId, item.productId), eq(stock.locationId, targetLocation.id)))
                                .limit(1)

                            if (existingStock) {
                                await tx
                                    .update(stock)
                                    .set({
                                        quantityOnHand: sql`${stock.quantityOnHand} - ${stockQty}`,
                                        updatedAt: new Date(),
                                    })
                                    .where(eq(stock.id, existingStock.id))
                            }
                        }

                        await tx.insert(stockMovements).values({
                            productId: item.productId,
                            productName: item.productName,
                            type: "out",
                            quantity: (-stockQty).toString(),
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
