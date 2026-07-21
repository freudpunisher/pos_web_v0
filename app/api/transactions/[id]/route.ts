import { NextResponse } from "next/server"
import db from "@/lib/db"
import { transactions, transactionItems, stockMovements, products, stock, locations, clients, creditRecords, cashFlow, productSellingUnits } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { requireAuth } from "@/lib/auth-guard"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAuth()
        if (auth.error) return auth.error
        if (auth.payload?.role !== "admin" && auth.payload?.role !== "manager") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()

        const [existing] = await db
            .select()
            .from(transactions)
            .where(eq(transactions.id, id))

        if (!existing) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
        }

        if (existing.status === "completed" || existing.status === "cancelled") {
            return NextResponse.json({ error: "Cannot modify a completed or cancelled transaction" }, { status: 400 })
        }

        const result = await db.transaction(async (tx) => {
            const updates: Record<string, any> = {}
            if (body.total !== undefined) updates.total = body.total.toString()
            if (body.clientId !== undefined) updates.clientId = body.clientId
            if (body.waiterId !== undefined) updates.waiterId = body.waiterId
            if (body.tableId !== undefined) updates.tableId = body.tableId

            if (Object.keys(updates).length > 0) {
                await tx.update(transactions).set(updates).where(eq(transactions.id, id))
            }

            if (body.items && Array.isArray(body.items)) {
                // 1. Reverse old stock movements (restore stock to pre-sale levels)
                const oldMovements = await tx
                    .select()
                    .from(stockMovements)
                    .where(eq(stockMovements.referenceId, id))

                for (const mov of oldMovements) {
                    const qty = Number.parseFloat(mov.quantity)
                    const reverseQty = -qty

                    await tx.update(products).set({
                        stock: sql`${products.stock} + ${reverseQty}`,
                    }).where(eq(products.id, mov.productId))

                    if (mov.locationId) {
                        const [existingStock] = await tx
                            .select()
                            .from(stock)
                            .where(and(eq(stock.productId, mov.productId), eq(stock.locationId, mov.locationId)))
                            .limit(1)
                        if (existingStock) {
                            await tx.update(stock).set({
                                quantityOnHand: sql`${stock.quantityOnHand} + ${reverseQty}`,
                                updatedAt: new Date(),
                            }).where(eq(stock.id, existingStock.id))
                        } else {
                            await tx.insert(stock).values({
                                productId: mov.productId,
                                locationId: mov.locationId,
                                quantityOnHand: Math.max(0, reverseQty).toString(),
                            })
                        }
                    }
                }

                // 2. Remove old items and movements
                await tx.delete(transactionItems).where(eq(transactionItems.transactionId, id))
                await tx.delete(stockMovements).where(eq(stockMovements.referenceId, id))

                // 3. Find bar location for new stock deductions
                const [barLocation] = await tx
                    .select()
                    .from(locations)
                    .where(eq(locations.type, "bar"))
                    .limit(1)

                // 4. Insert new items and deduct stock
                for (const item of body.items) {
                    const itemQuantity = Number(item.quantity)

                    let conversionFactor = 1
                    if (item.sellingUnitId) {
                        const [su] = await tx
                            .select()
                            .from(productSellingUnits)
                            .where(eq(productSellingUnits.id, item.sellingUnitId))
                            .limit(1)
                        if (su) {
                            conversionFactor = Number(su.conversionFactor)
                        }
                    }
                    const stockQty = itemQuantity * conversionFactor

                    await tx.insert(transactionItems).values({
                        transactionId: id,
                        productId: item.productId,
                        productName: item.productName,
                        quantity: itemQuantity.toString(),
                        price: item.price.toString(),
                        discount: (item.discount || 0).toString(),
                    })

                    await tx.update(products).set({
                        stock: sql`${products.stock} - ${stockQty}`,
                    }).where(eq(products.id, item.productId))

                    if (barLocation) {
                        const [existingStock] = await tx
                            .select()
                            .from(stock)
                            .where(and(eq(stock.productId, item.productId), eq(stock.locationId, barLocation.id)))
                            .limit(1)

                        if (existingStock) {
                            await tx.update(stock).set({
                                quantityOnHand: sql`${stock.quantityOnHand} - ${stockQty}`,
                                updatedAt: new Date(),
                            }).where(eq(stock.id, existingStock.id))
                        } else {
                            await tx.insert(stock).values({
                                productId: item.productId,
                                locationId: barLocation.id,
                                quantityOnHand: Math.max(0, -stockQty).toString(),
                            })
                        }

                        await tx.insert(stockMovements).values({
                            productId: item.productId,
                            productName: item.productName || "",
                            type: "out",
                            quantity: String(-stockQty),
                            userId: existing.userId,
                            locationId: barLocation.id,
                            referenceId: id,
                            referenceType: "order",
                            notes: `Modified order ${id}`,
                        })
                    }
                }

                // 5. Recalculate total from items
                const newTotal = body.items.reduce((sum: number, item: any) => {
                    return sum + Number(item.price) * Number(item.quantity)
                }, 0)
                await tx.update(transactions).set({ total: newTotal.toString() }).where(eq(transactions.id, id))
            }

            const updated = await db.query.transactions.findFirst({
                where: eq(transactions.id, id),
                with: { items: true, client: true, user: true, table: true },
            })

            return updated
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to update transaction:", error)
        return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 })
    }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = await requireAuth()
        if (auth.error) return auth.error
        if (auth.payload?.role !== "admin" && auth.payload?.role !== "manager") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()

        const [existing] = await db
            .select()
            .from(transactions)
            .where(eq(transactions.id, id))

        if (!existing) {
            return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
        }

        if (existing.status === "cancelled") {
            return NextResponse.json({ error: "Transaction is already cancelled" }, { status: 400 })
        }

        if (body.action === "cancel") {
            await db.transaction(async (tx) => {
                // Restore stock from stock movements
                const movements = await tx
                    .select()
                    .from(stockMovements)
                    .where(eq(stockMovements.referenceId, id))

                for (const mov of movements) {
                    const qty = Number.parseFloat(mov.quantity)
                    const reverseQty = -qty

                    await tx.update(products).set({
                        stock: sql`${products.stock} + ${reverseQty}`,
                    }).where(eq(products.id, mov.productId))

                    if (mov.locationId) {
                        const [existingStock] = await tx
                            .select()
                            .from(stock)
                            .where(and(eq(stock.productId, mov.productId), eq(stock.locationId, mov.locationId)))
                            .limit(1)
                        if (existingStock) {
                            await tx.update(stock).set({
                                quantityOnHand: sql`${stock.quantityOnHand} + ${reverseQty}`,
                                updatedAt: new Date(),
                            }).where(eq(stock.id, existingStock.id))
                        } else {
                            await tx.insert(stock).values({
                                productId: mov.productId,
                                locationId: mov.locationId,
                                quantityOnHand: Math.max(0, reverseQty).toString(),
                            })
                        }
                    }
                }

                // Record cancel movement
                if (movements.length > 0) {
                    await tx.insert(stockMovements).values({
                        productId: movements[0].productId,
                        productName: movements[0].productName,
                        type: "in",
                        quantity: String(-movements.reduce((sum, m) => sum + Number.parseFloat(m.quantity), 0)),
                        userId: existing.userId,
                        locationId: movements[0].locationId || undefined,
                        referenceId: id,
                        referenceType: "cancellation",
                    })
                }

                await tx.update(transactions).set({
                    status: "cancelled",
                    cancelReason: body.cancelReason || null,
                }).where(eq(transactions.id, id))
            })

            const updated = await db.query.transactions.findFirst({
                where: eq(transactions.id, id),
                with: { items: true, client: true, user: true, table: true },
            })

            return NextResponse.json(updated)
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (error) {
        console.error("Failed to cancel transaction:", error)
        return NextResponse.json({ error: "Failed to cancel transaction" }, { status: 500 })
    }
}
