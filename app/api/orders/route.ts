import { NextResponse } from "next/server"
import db from "@/lib/db"
import { caisseSessions, transactions, products, stock, stockMovements, locations, productSellingUnits } from "@/lib/db/schema"
import { eq, and, desc, sql, max } from "drizzle-orm"

export async function GET() {
    try {
        const orders = await db.query.transactions.findMany({
            where: eq(transactions.type, "sale"),
            orderBy: [desc(transactions.date)],
            with: {
                items: true,
                client: true,
                user: true,
                location: { columns: { id: true, name: true } },
                deliveryLocation: { columns: { id: true, name: true } },
            },
        })
        return NextResponse.json(orders)
    } catch (error) {
        console.error("Failed to fetch orders:", error)
        return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { items, userId, clientId, locationId, deliveryLocationId, notes } = body

        if (!items || items.length === 0 || !userId) {
            return NextResponse.json({ error: "Items and userId are required" }, { status: 400 })
        }

        // Require an open caisse session before any sale
        const [openSession] = await db
            .select()
            .from(caisseSessions)
            .where(eq(caisseSessions.status, "open"))
            .limit(1)
        if (!openSession) {
            return NextResponse.json(
                { error: "Aucune session caisse ouverte. Veuillez ouvrir la caisse avant d'effectuer une vente." },
                { status: 400 }
            )
        }

        // Resolve selling location
        let saleLocation = null
        if (locationId) {
            const [loc] = await db.select().from(locations).where(eq(locations.id, locationId)).limit(1)
            saleLocation = loc
        } else {
            // Default to first store or warehouse
            const [defaultLoc] = await db.select().from(locations).where(eq(locations.isActive, true)).limit(1)
            saleLocation = defaultLoc
        }

        const total = items.reduce(
            (sum: number, item: any) => sum + item.price * item.quantity * (1 - (item.discount || 0) / 100),
            0,
        )

        // Generate sequential reference: FACT-YYYY-MM-XXXXX
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, "0")
        const prefix = `FACT-${year}-${month}-`
        const [lastRef] = await db
            .select({ maxRef: max(transactions.reference) })
            .from(transactions)
            .where(sql`${transactions.reference} ~ ${`^FACT-${year}-${month}-[0-9]+$`}`)
        const lastNum = lastRef?.maxRef ? parseInt(lastRef.maxRef.split("-").pop()!, 10) : 0
        const reference = `${prefix}${String(lastNum + 1).padStart(5, "0")}`

        const [newOrder] = await db
            .insert(transactions)
            .values({
                type: "sale",
                status: "pending",
                orderStatus: "pending",
                total: total.toString(),
                userId,
                clientId: clientId || null,
                locationId: saleLocation?.id || null,
                deliveryLocationId: deliveryLocationId || null,
                reference,
            })
            .returning()

        // Insert transaction items and deduct stock
        const { transactionItems } = await import("@/lib/db/schema")
        for (const item of items) {
            // Look up conversion factor if selling unit is specified
            let conversionFactor = 1
            if (item.sellingUnitId) {
                const [su] = await db
                    .select()
                    .from(productSellingUnits)
                    .where(eq(productSellingUnits.id, item.sellingUnitId))
                    .limit(1)
                if (su) {
                    conversionFactor = Number(su.conversionFactor)
                }
            }
            const stockQty = item.quantity * conversionFactor

            // Look up product info for stock tracking
            const [productInfo] = await db
                .select({ name: products.name })
                .from(products)
                .where(eq(products.id, item.productId))
                .limit(1)

            // Validate stock at selling location for tracked products
            if (saleLocation) {
                const [locationStock] = await db
                    .select({ quantityOnHand: stock.quantityOnHand })
                    .from(stock)
                    .where(and(eq(stock.productId, item.productId), eq(stock.locationId, saleLocation.id)))
                    .limit(1)

                const availableQty = Number(locationStock?.quantityOnHand ?? 0)
                if (availableQty < stockQty) {
                    return NextResponse.json({
                        error: `Stock insuffisant au ${saleLocation.name} pour ${productInfo.name}. Disponible: ${availableQty}, requis: ${stockQty}`
                    }, { status: 400 })
                }
            }

            await db.insert(transactionItems).values({
                transactionId: newOrder.id,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price.toString(),
                discount: (item.discount || 0).toString(),
            })

            // Deduct stock using converted quantity
            await db
                .update(products)
                .set({ stock: sql`${products.stock} - ${stockQty}` })
                .where(eq(products.id, item.productId))

            // Deduct per-location stock from selling location
            if (saleLocation) {
                const [existingStock] = await db
                    .select()
                    .from(stock)
                    .where(and(eq(stock.productId, item.productId), eq(stock.locationId, saleLocation.id)))
                    .limit(1)
                if (existingStock) {
                    await db
                        .update(stock)
                        .set({ quantityOnHand: sql`${stock.quantityOnHand} - ${stockQty}`, updatedAt: new Date() })
                        .where(eq(stock.id, existingStock.id))
                } else {
                    await db.insert(stock).values({
                        productId: item.productId,
                        locationId: saleLocation.id,
                        quantityOnHand: String(-stockQty),
                    })
                }

                // Record stock movement
                await db.insert(stockMovements).values({
                    productId: item.productId,
                    productName: item.productName,
                    type: "out",
                    quantity: String(-stockQty),
                    userId,
                    locationId: saleLocation.id,
                    referenceId: newOrder.id,
                    referenceType: "order",
                    notes: `Order ${newOrder.id}`,
                })
            }
        }

        // Auto-create stock transfer if deliveryLocationId is specified
        if (deliveryLocationId && saleLocation) {
            const { stockTransfers } = await import("@/lib/db/schema")
            await db.insert(stockTransfers).values({
                fromLocationId: saleLocation.id,
                toLocationId: deliveryLocationId,
                userId,
                transactionId: newOrder.id,
                status: "pending",
                notes: `Auto-transfer for order ${reference}`,
            })
        }

        const order = await db.query.transactions.findFirst({
            where: eq(transactions.id, newOrder.id),
            with: {
                items: true,
                location: { columns: { id: true, name: true } },
                deliveryLocation: { columns: { id: true, name: true } },
            },
        })

        return NextResponse.json(order)
    } catch (error) {
        console.error("Failed to create order:", error)
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
    }
}
