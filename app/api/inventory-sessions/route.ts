import { NextResponse } from "next/server"
import db from "@/lib/db"
import { inventory, inventoryItems, stock, products, locations } from "@/lib/db/schema"
import { desc, eq, and, sql } from "drizzle-orm"

export async function GET() {
    try {
        const sessions = await db.query.inventory.findMany({
            with: {
                user: { columns: { id: true, name: true } },
                location: { columns: { id: true, name: true, type: true } },
                items: true,
            },
            orderBy: [desc(inventory.createdAt)]
        })
        return NextResponse.json(sessions)
    } catch (error) {
        console.error("Failed to fetch inventory sessions:", error)
        return NextResponse.json({ error: "Failed to fetch inventory sessions" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { countedBy, notes, initializePhysicalFromLogical, locationId } = body

        if (!countedBy) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const result = await db.transaction(async (tx) => {
            // 1. Create session
            const [session] = await tx
                .insert(inventory)
                .values({
                    countedBy,
                    notes,
                    locationId: locationId || null,
                    status: "in_progress",
                })
                .returning()

            // 2. Initialize items from logical stock
            if (locationId) {
                // Filter by location
                const locationStock = await tx
                    .select({
                        id: products.id,
                        productStock: products.stock,
                        quantityOnHand: stock.quantityOnHand,
                    })
                    .from(stock)
                    .innerJoin(products, eq(products.id, stock.productId))
                    .where(eq(stock.locationId, locationId))

                for (const s of locationStock) {
                    const logicalQty = Number(s.quantityOnHand ?? s.productStock ?? 0)
                    const initialPhysicalQty = initializePhysicalFromLogical ? logicalQty : 0
                    const initialVariance = initialPhysicalQty - logicalQty
                    await tx.insert(inventoryItems).values({
                        inventoryId: session.id,
                        productId: s.id,
                        quantityInStock: logicalQty.toString(),
                        physicalQuantity: initialPhysicalQty.toString(),
                        variance: initialVariance.toString(),
                    })
                }
            } else {
                // Fallback: all products from products.stock
                const allProducts = await tx
                    .select({
                        id: products.id,
                        productStock: products.stock,
                        quantityOnHand: stock.quantityOnHand,
                    })
                    .from(products)
                    .leftJoin(stock, eq(products.id, stock.productId))

                for (const p of allProducts) {
                    const logicalQty = Number(p.quantityOnHand ?? p.productStock ?? 0)
                    const initialPhysicalQty = initializePhysicalFromLogical ? logicalQty : 0
                    const initialVariance = initialPhysicalQty - logicalQty
                    await tx.insert(inventoryItems).values({
                        inventoryId: session.id,
                        productId: p.id,
                        quantityInStock: logicalQty.toString(),
                        physicalQuantity: initialPhysicalQty.toString(),
                        variance: initialVariance.toString(),
                    })
                }
            }

            return session
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to start inventory session:", error)
        return NextResponse.json({ error: "Failed to start inventory session" }, { status: 500 })
    }
}
