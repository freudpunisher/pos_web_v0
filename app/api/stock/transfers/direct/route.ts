import { NextResponse } from "next/server"
import db from "@/lib/db"
import { stockTransfers, stockTransferItems, stock, products, stockMovements } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { fromLocationId, toLocationId, userId, notes, items } = body

        if (!fromLocationId || !toLocationId || !userId || !items?.length) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        if (fromLocationId === toLocationId) {
            return NextResponse.json({ error: "Source and destination must differ" }, { status: 400 })
        }

        const result = await db.transaction(async (tx) => {
            const [newTransfer] = await tx
                .insert(stockTransfers)
                .values({
                    fromLocationId,
                    toLocationId,
                    userId,
                    notes,
                    transferType: "direct",
                    status: "completed",
                    approvedBy: userId,
                    approvedAt: new Date(),
                    receivedAt: new Date(),
                })
                .returning()

            for (const item of items) {
                const { productId, quantity } = item

                const [product] = await tx
                    .select({
                        name: products.name,
                        minStock: products.minStock
                    })
                    .from(products)
                    .where(eq(products.id, productId))
                    .limit(1)

                if (!product) throw new Error(`Product ${productId} not found`)

                await tx.insert(stockTransferItems).values({
                    transferId: newTransfer.id,
                    productId,
                    quantity: quantity.toString(),
                })

                const [sourceStock] = await tx
                    .select()
                    .from(stock)
                    .where(sql`${stock.productId} = ${productId} AND ${stock.locationId} = ${fromLocationId}`)

                if (!sourceStock || Number(sourceStock.quantityOnHand) < quantity) {
                    throw new Error(
                        `Insufficient stock for ${product?.name || productId}. Available: ${sourceStock?.quantityOnHand || 0}, needed: ${quantity}`
                    )
                }

                await tx
                    .update(stock)
                    .set({
                        quantityOnHand: sql`${stock.quantityOnHand} - ${quantity}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(stock.id, sourceStock.id))

                const [destStock] = await tx
                    .select()
                    .from(stock)
                    .where(sql`${stock.productId} = ${productId} AND ${stock.locationId} = ${toLocationId}`)

                if (destStock) {
                    await tx
                        .update(stock)
                        .set({
                            quantityOnHand: sql`${stock.quantityOnHand} + ${quantity}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(stock.id, destStock.id))
                } else {
                    await tx.insert(stock).values({
                        productId,
                        locationId: toLocationId,
                        quantityOnHand: String(quantity),
                    })
                }

                await tx.insert(stockMovements).values({
                    productId,
                    productName: product?.name || "Unknown",
                    type: "transfer",
                    quantity: String(-quantity),
                    userId,
                    locationId: fromLocationId,
                    referenceId: newTransfer.id,
                    referenceType: "stock_transfer",
                    notes: `Direct transfer: ${notes || `to ${toLocationId}`}`,
                })
            }

            return newTransfer
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Failed to create direct transfer:", error)
        return NextResponse.json({ error: error.message || "Failed to create direct transfer" }, { status: 400 })
    }
}
