import { NextResponse } from "next/server"
import db from "@/lib/db"
import { stock, stockAdjustments, products, stockMovements } from "@/lib/db/schema"
import { eq, and, desc, sql } from "drizzle-orm"
import { resolveWarehouse } from "@/lib/db/location-utils"

export async function GET() {
    try {
        const adjustments = await db.query.stockAdjustments.findMany({
            with: {
                product: true,
                user: true,
            },
            orderBy: [desc(stockAdjustments.createdDate)]
        })

        return NextResponse.json(adjustments)
    } catch (error) {
        console.error("Failed to fetch stock adjustments:", error)
        return NextResponse.json({ error: "Failed to fetch stock adjustments" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { productId, productName, quantityChange, adjustmentType, reason, notes, userId, createdBy, locationId } = body
        const effectiveUserId = userId || createdBy

        if (!productId || quantityChange === undefined || !adjustmentType || !reason) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const result = await db.transaction(async (tx) => {
            // 1. Create adjustment record
            const [newAdjustment] = await tx.insert(stockAdjustments).values({
                productId,
                quantityChange,
                adjustmentType,
                reason,
                createdBy: effectiveUserId,
                notes,
            }).returning()

            // 2. Update the stock table (specific location if provided, otherwise all)
            const targetLocationId = locationId || (await resolveWarehouse(tx, "ingredient")).id
            const [existingStock] = await tx
                .select()
                .from(stock)
                .where(and(eq(stock.productId, productId), eq(stock.locationId, targetLocationId)))
                .limit(1)

            if (existingStock) {
                await tx.update(stock).set({
                    quantityOnHand: sql`${stock.quantityOnHand} + ${quantityChange}`,
                    updatedAt: new Date(),
                }).where(eq(stock.id, existingStock.id))
            } else {
                await tx.insert(stock).values({
                    productId,
                    locationId: targetLocationId,
                    quantityOnHand: String(quantityChange),
                })
            }

            // 3. Update main products table total stock
            const [product] = await tx.select().from(products).where(eq(products.id, productId))
            if (product) {
                await tx.update(products).set({
                    stock: String(Number(product.stock || 0) + quantityChange)
                }).where(eq(products.id, productId))
            }

            // 4. Record stock movement
            await tx.insert(stockMovements).values({
                productId,
                productName: productName || product?.name || "Unknown",
                type: "adjustment",
                quantity: String(quantityChange),
                userId: effectiveUserId,
                locationId: targetLocationId,
                referenceId: newAdjustment.id,
                referenceType: "stock_adjustment",
                notes: `Adjustment: ${reason}`,
            })

            return newAdjustment
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Failed to create stock adjustment:", error)
        return NextResponse.json({ error: error.message || "Failed to create stock adjustment" }, { status: 500 })
    }
}
