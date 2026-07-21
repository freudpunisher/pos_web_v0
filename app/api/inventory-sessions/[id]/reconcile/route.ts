import { NextResponse } from "next/server"
import db from "@/lib/db"
import { inventory, inventoryItems, stock, stockMovements, products, stockAdjustments } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await db.query.inventory.findFirst({
            where: eq(inventory.id, id),
            with: {
                items: {
                    with: {
                        product: true
                    }
                }
            }
        })

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }

        if (session.status === "reconciled") {
            return NextResponse.json({ error: "Session already reconciled" }, { status: 400 })
        }

        const result = await db.transaction(async (tx) => {
            // Validate: check that physical counts don't exceed reserved stock limits
            const errors: string[] = []
            for (const item of session.items) {
                const physicalQty = Number(item.physicalQuantity ?? 0)
                const logicalQty = Number(item.quantityInStock ?? 0)
                if (physicalQty < 0) {
                    errors.push(`${item.product?.name}: physical count cannot be negative`)
                }
                // Check reserved stock
                const [stockRow] = session.locationId
                    ? await tx.select().from(stock).where(and(
                        eq(stock.productId, item.productId),
                        eq(stock.locationId, session.locationId)
                    ))
                    : await tx.select().from(stock).where(eq(stock.productId, item.productId))
                if (stockRow && physicalQty < Number(stockRow.quantityReserved)) {
                    errors.push(
                        `${item.product?.name}: physical count (${physicalQty}) is less than reserved stock (${stockRow.quantityReserved})`
                    )
                }
            }
            if (errors.length > 0) {
                throw new Error(
                    `Cannot reconcile: ${errors.length} issue(s) found.\n${errors.join("\n")}`
                )
            }

            // 1. Update stock levels and record movements for each variance
            for (const item of session.items) {
                const variance = Number(item.variance ?? 0)
                const physicalQty = Number(item.physicalQuantity ?? 0)

                // Resolve the location stock row
                const [stockRow] = session.locationId
                    ? await tx.select().from(stock).where(and(
                        eq(stock.productId, item.productId),
                        eq(stock.locationId, session.locationId)
                    ))
                    : await tx.select().from(stock).where(eq(stock.productId, item.productId))

                if (variance !== 0) {
                    if (stockRow) {
                        await tx
                            .update(stock)
                            .set({
                                quantityOnHand: physicalQty.toString(),
                                lastCountedDate: new Date(),
                                updatedAt: new Date(),
                            })
                            .where(eq(stock.id, stockRow.id))
                    } else if (session.locationId) {
                        await tx.insert(stock).values({
                            productId: item.productId,
                            locationId: session.locationId,
                            quantityOnHand: physicalQty.toString(),
                            quantityReserved: "0",
                            reorderLevel: Number(item.product?.minStock || 10),
                            reorderQuantity: 20,
                            lastCountedDate: new Date(),
                            updatedAt: new Date(),
                        })
                    }

                    // Update Products table (denormalized total stock)
                    const [product] = await tx.select().from(products).where(eq(products.id, item.productId))
                    if (product) {
                        await tx.update(products).set({
                            stock: physicalQty.toString()
                        }).where(eq(products.id, item.productId))
                    }

                    // Record Stock Movement
                    await tx.insert(stockMovements).values({
                        productId: item.productId,
                        productName: item.product.name,
                        type: "inventory",
                        quantity: variance.toString(),
                        userId: session.countedBy,
                        locationId: session.locationId,
                        referenceId: session.id,
                        referenceType: "inventory_session",
                        notes: `Inventory Count Reconciliation (Session ${session.id})`,
                    })

                    // Record detailed adjustment
                    await tx.insert(stockAdjustments).values({
                        productId: item.productId,
                        quantityChange: variance.toString(),
                        adjustmentType: variance < 0 ? "loss" : "correction",
                        reason: variance < 0 ? "Physical inventory loss" : "Physical inventory surplus",
                        createdBy: session.countedBy,
                        notes: `Session ${session.id} | logical=${Number(item.quantityInStock)} physical=${physicalQty} variance=${variance}`,
                    })
                } else {
                    // Even if variance is 0, update last counted date
                    if (stockRow) {
                        await tx
                            .update(stock)
                            .set({
                                lastCountedDate: new Date(),
                                updatedAt: new Date(),
                            })
                            .where(eq(stock.id, stockRow.id))
                    } else if (session.locationId) {
                        await tx.insert(stock).values({
                            productId: item.productId,
                            locationId: session.locationId,
                            quantityOnHand: physicalQty.toString(),
                            quantityReserved: "0",
                            reorderLevel: Number(item.product?.minStock || 10),
                            reorderQuantity: 20,
                            lastCountedDate: new Date(),
                            updatedAt: new Date(),
                        })
                    }
                }
            }

            // 2. Mark session as reconciled
            const [updatedSession] = await tx
                .update(inventory)
                .set({
                    status: "reconciled",
                    updatedAt: new Date(),
                })
                .where(eq(inventory.id, id))
                .returning()

            return updatedSession
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Failed to reconcile inventory session:", error)
        return NextResponse.json({ error: error.message || "Failed to reconcile inventory session" }, { status: 500 })
    }
}
