import { NextResponse } from "next/server"
import db from "@/lib/db"
import { stockTransfers, stockTransferItems, stock, products, stockMovements } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { userId } = body

        if (!userId) {
            return NextResponse.json({ error: "userId is required" }, { status: 400 })
        }

        const result = await db.transaction(async (tx) => {
            const [transfer] = await tx
                .select()
                .from(stockTransfers)
                .where(eq(stockTransfers.id, id))

            if (!transfer) throw new Error("Transfer not found")
            if (transfer.status !== "approved") throw new Error("Transfer must be approved before receiving")

            const items = await tx
                .select()
                .from(stockTransferItems)
                .where(eq(stockTransferItems.transferId, id))

            if (!items.length) throw new Error("No items in this transfer")

            const { fromLocationId, toLocationId } = transfer

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

                const [sourceStock] = await tx
                    .select()
                    .from(stock)
                    .where(sql`${stock.productId} = ${productId} AND ${stock.locationId} = ${fromLocationId}`)

                if (!sourceStock || Number(sourceStock.quantityOnHand) < quantity) {
                    throw new Error(`Insufficient stock for ${product?.name || productId}. Available: ${sourceStock?.quantityOnHand || 0}, needed: ${quantity}`)
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
                    referenceId: id,
                    referenceType: "stock_transfer",
                    notes: `Transfer completed: ${transfer.notes || `to ${toLocationId}`}`,
                })
            }

            const [updated] = await tx
                .update(stockTransfers)
                .set({ status: "completed", receivedAt: new Date() })
                .where(eq(stockTransfers.id, id))
                .returning()

            return updated
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Failed to receive transfer:", error)
        return NextResponse.json({ error: error.message || "Failed to receive transfer" }, { status: 400 })
    }
}
